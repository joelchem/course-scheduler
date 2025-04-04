import { setupCache } from "axios-cache-interceptor";
import { Course, Day, Meeting, Section, TimeBlock } from "../types/api";
import axios from "axios";

const api = setupCache(axios.create(), {
  ttl: 1000 * 60 * 60 * 24,
});

export function sameSection(sec1: [Course, Section] | null, sec2: [Course, Section] | null) {

  return sec1 != null && sec2 != null && sec1[0]._id == sec2[0]._id && sec1[1].section_id == sec2[1].section_id
}

export function sectionIncluded(sec: [Course, Section], lst: [Course, Section][]) {
  for (let otherSection of lst) {
    if (sameSection(sec, otherSection)) {
      return true;
    }
  }
  return false;
}

export function parseTime(time: string): number {
  const period = time.slice(-2).toLowerCase();
  time = time.slice(0, -2);

  let [hour, minute] = time.split(":").map(Number);

  if (period === "pm" && hour !== 12) {
    hour += 12;
  }
  if (period === "am" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}

// Gets the closest hour (floored)
export function timeToStr(time: number): string {
  let hour = Math.floor(time / 60);
  let ampm = hour < 12 ? "am" : "pm";
  hour = hour < 12 ? hour : hour - 12;
  hour = hour == 0 ? 12 : hour;

  return "" + hour + ampm;
}

export function doesIntersect(time1: TimeBlock, time2: TimeBlock): boolean {
  return (
    time1.day == time2.day && time1.start < time2.end && time2.start < time1.end
  );
}

export function parseMeetingTime(time: string): {
  days: Day[];
  start: number;
  end: number;
} {
  // If a section meeting has "TBA" "Class time/details on ELMS" or "Sa" or "Su"
  // in it then give it "Other" day
  if (
    time.includes("TBA") ||
    time.includes("Class time/details on ELMS") ||
    time.includes("Sa") ||
    time.includes("Su") ||
    time.trim() == ""
  ) {
    return { days: ["Other"], start: 0, end: 0 };
  }

  let rawParts = time.split(" ");
  let days: Day[] = ["M", "Tu", "W", "Th", "F"];
  days = days.filter((day) => rawParts[0].includes(day));

  return {
    days: days,
    start: parseTime(rawParts[1]),
    end: parseTime(rawParts[3]),
  };
}

export function getDayPartOfTime(input: string): string {
  let rawParts = input.split(" ");
  let days: Day[] = ["M", "Tu", "W", "Th", "F"];
  days.forEach(day => {
    if (rawParts[0].startsWith(day)) {
      rawParts[0] = rawParts[0].slice(day.length);
    }
  })
  return (rawParts[0].trim() == "") ? input.split(" ")[0] : "";
}

export function minifyTimeCode(input: string): string {
  const timeMatch = input.match(
    /(\d{1,2}:\d{2}|\d{1,2})(am|pm)\s*-\s*(\d{1,2}:\d{2}|\d{1,2})(am|pm)/i
  );
  if (!timeMatch) return input;

  let [, startTime, startPeriod, endTime, endPeriod] = timeMatch;

  // Remove :00 from times like 9:00
  const simplifyTime = (time: string) => {
    return time.endsWith(":00") ? time.split(":")[0] : time;
  };

  startTime = simplifyTime(startTime);
  endTime = simplifyTime(endTime);

  const needsStartPeriod =
    startPeriod.toLowerCase() !== endPeriod.toLowerCase();

  return `${startTime}${needsStartPeriod ? startPeriod : ""
    }-${endTime}${endPeriod}`;
}

export function getMeetingTimeBlocks(
  section: [Course, Section],
  meeting: Meeting
): TimeBlock[] {
  let out: TimeBlock[] = [];

  let parsedTime = parseMeetingTime(meeting.time);
  parsedTime.days.forEach((day) => {
    out.push({
      course: section[0],
      section: section[1],
      meeting: meeting,
      day: day,
      start: parsedTime.start,
      end: parsedTime.end,
    });
  });

  return out;
}

export function getTimeBlocks(sections: [Course, Section][]): TimeBlock[] {
  let out: TimeBlock[] = [];

  sections.forEach((section) => {
    section[1].meetings.forEach((meeting) => {
      out = out.concat(getMeetingTimeBlocks(section, meeting));
    });
  });

  return out;
}

export function groupTimeBlocks(blocks: TimeBlock[]): TimeBlock[][] {
  let out: TimeBlock[][] = [];

  for (let block of blocks) {
    let intersect: number[] = [];

    out.forEach((group, i) => {
      for (let innerBlock of group) {
        if (doesIntersect(block, innerBlock)) {
          intersect.push(i);
          break;
        }
      }
    });

    let newGroup = [block];
    intersect.forEach((i) => {
      newGroup = newGroup.concat(out[i]);
    });
    out = out.filter((_, i) => !intersect.includes(i));
    out.push(newGroup);
  }

  return out;
}
export type ConflictState = "check" | "warn" | "x" | "neutral";

export function timeBetween(t1: TimeBlock, t2: TimeBlock) {
  return Math.min(Math.abs(t2.start - t1.end), Math.abs(t1.start - t2.end));
}

export async function getTravelTime(t1: TimeBlock, t2: TimeBlock): Promise<number | null> {
  let first: TimeBlock;
  let second: TimeBlock;
  if (t1.start < t2.start) {
    first = t1;
    second = t2;
  } else {
    first = t1;
    second = t2;
  }

  let loc1 = first.meeting.location.split(" ")[0];
  let loc2 = second.meeting.location.split(" ")[0];

  let res = await api.get(`https://api.scheduleterp.com/traveltime/${loc1}/${loc2}`);
  if (res.data.success) {
    return Math.floor(res.data.time_mins);
  } else {
    return null;
  }

}

export async function getConflict(
  section: [Course, Section],
  meeting: Meeting,
  selected: [Course, Section][]
): Promise<ConflictState> {
  if (parseMeetingTime(meeting.time).days.includes("Other")) {
    return "neutral";
  }

  let meetingBlocks = getMeetingTimeBlocks(section, meeting);
  let otherBlocks = getTimeBlocks(selected);

  let out: ConflictState = "check";

  for(let otherBlock of otherBlocks) {
    for(let meetingBlock of meetingBlocks) {
      if (
        doesIntersect(meetingBlock, otherBlock) &&
        section[0]._id != otherBlock.course._id
      ) {
        out = "x";

      } else if (section[0]._id != otherBlock.course._id &&
        meetingBlock.day == otherBlock.day
        && timeBetween(meetingBlock, otherBlock) <= 30) {
          
        let travel = await getTravelTime(meetingBlock, otherBlock);
        console.log(section[0]._id, otherBlock.course._id, travel, timeBetween(meetingBlock, otherBlock))
        if(travel && timeBetween(meetingBlock, otherBlock) <= travel) {
          out = (out == "x") ? "x" : "warn";
        }
      }
    }
  }

  return out;
}

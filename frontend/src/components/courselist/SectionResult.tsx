import {
  textGradient,
  getGradientColor,
  backgroundGradient,
} from "../schedule/utils/colors";
import styles from "./courselist.module.css";

import { SectionResultComponent } from "./courselist.types";
import { setupCache } from "axios-cache-interceptor";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { ProfessorGPA } from "../../types/api";
import { ConflictState, getConflict, sameSection } from "../../utils/sectionUtils";
import { AppContext } from "../app/App";

const api = setupCache(axios.create(), {
  ttl: 1000 * 60 * 5,
});

const SectionResult: SectionResultComponent = ({
  section,
  course,
  selectedSections,
  onclick,
}) => {
  let [gpa, setGPA] = useState<number | null>(null);
  let [rating, setRatings] = useState<{ [prof: string]: number }>({});
  let [slug, setSlug] = useState<{[prof: string]: string }>({});
  let [types, setTypes] = useState<ConflictState[]>(Array(section.meetings.length).fill("neutral"));
  let appContext = useContext(AppContext);

  useEffect(() => {
    Promise.all(types.map(async (_,i) => await getConflict([course, section], section.meetings[i], selectedSections))).then(
      res => setTypes(res)
    )
  }, []);

  useEffect(() => {
    let res: Promise<ProfessorGPA>[] = section.instructors.map(
      async (prof) =>
        (
          await api.get("https://api.scheduleterp.com/prof", {
            params: { prof: prof, course: course._id },
          })
        ).data
    );

    res.reverse().forEach((res) =>
      res.then((res) => {
        res.gpa ? setGPA(res.gpa) : setGPA(null);
      })
    );

    res.forEach((promise, i) =>
      promise.then((res) => {
        setRatings((ratings) =>
          res.rating
            ? { ...ratings, [section.instructors[i]]: res.rating }
            : ratings
        );
        setSlug((slugs) => 
          res.slug ?
          {...slugs, [section.instructors[i]]: res.slug}
          : slugs
        );
      })
    );
  }, [section.instructors, course]);

  let selected = !!selectedSections.find(
    (s) => sameSection(s, [course, section])
  );

  return (
    <div
      onClick={() => onclick(section)}
      onPointerEnter={(e) => (e.pointerType !== 'touch') ? appContext?.setHovered([course, section]) : null}
      onPointerLeave={(e) => (e.pointerType !== 'touch') ? 
        appContext?.setHovered(last => sameSection(last, [course, section]) ? null : last) : null}
      className={`${styles.section} ${selected ? styles.activeSection : ""}`}
    >
      <div className={styles.sectionTopRow}>
        <div className={styles.sectionID}>
          <span>{section.section_id}</span>
        </div>
        <div className={styles.instructors}>
          {section.instructors.map((name) => (
            <span key={name} title="Show on PlanetTerp">
              <a
                href={`https://planetterp.com/professor/${slug[name]}`}
                target="_blank" rel="noopener noreferrer"
                style={rating[name] ? {} : {pointerEvents: "none"}}
                onClick={(event) => event.stopPropagation()}
              >
              {name}
              {rating[name] ? (
                <span
                  className={styles.profRating}
                  style={{
                    backgroundColor: getGradientColor(
                      backgroundGradient,
                      (100 * rating[name]) / 5
                    ),
                  }}
                >
                  {rating[name].toFixed(2)}
                </span>
              ) : null}
              </a>
            </span>
          ))}
        </div>
        <div className={styles.gpa}>
          {gpa ? (
            <span>
              GPA:{" "}
              <span
                style={{
                  color: getGradientColor(textGradient, (100 * gpa) / 4),
                }}
              >
                {gpa.toFixed(2)}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.seatSection}>
        <span
          className={styles.seats}
          style={{
            color:
              section.open_seats == 0
                ? "#cc6666"
                : section.open_seats <= Math.max(10, section.total_seats / 4)
                ? "#C5CA5A"
                : "#868E96",
            fontWeight:
              section.open_seats <= Math.max(10, section.total_seats / 4)
                ? "bold"
                : "normal",
          }}
        >
          {section.open_seats}/{section.total_seats} seats open
        </span>
        <div
          className={styles.waitlistHoldfile}
          style={{
            display:
              section.open_seats > Math.max(10, section.total_seats / 4) &&
              section.waitlist == 0 &&
              section.holdfile == 0
                ? "none"
                : "block",
          }}
        >
          <span
            style={{
              color: section.waitlist > 0 ? "inherit" : "#868E96",
              fontWeight: section.waitlist > 0 ? "bold" : "normal",
            }}
          >
            Waitlist: {section.waitlist}{" "}
          </span>
          <span
            style={{
              color: section.holdfile > 0 ? "inherit" : "#868E96",
              fontWeight: section.holdfile > 0 ? "bold" : "normal",
            }}
          >
            Holdfile: {section.holdfile}
          </span>
        </div>
      </div>

      <div className={styles.meetingSection}>
        {/* TODO: HANDLE Contact department times */}
        {section.meetings.map((meeting, i) => {
          let type: ConflictState = types[i];
          return (
            <div
              className={styles.meeting}
              key={meeting.time}
              style={{
                fontWeight:
                  type == "check" || type == "neutral" ? "normal" : "bold",
                color: type == "check" ? "#868E96" : "inherit",
              }}
            >
              <div className={styles.meetingIndicator}>
                {type != "neutral" ? <img src={`/${type}.svg`} /> : null}
              </div>
              <span className={styles.meetingTime}>{meeting.time}</span>
              <span className={styles.meetingLocation}>
                {meeting.location}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionResult;

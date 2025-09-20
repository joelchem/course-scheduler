export interface Meeting {
  time: string;
  location: string;
  type: string;
  message: string;
}

export interface Section {
  section_id: string;
  total_seats: number;
  open_seats: number;
  waitlist: number;
  holdfile: number;
  instructors: string[];
  footnote_marked: boolean;
  meetings: Meeting[];
  non_standard_dates: string;
}

export interface Course {
  _id: string;
  name: string;
  reqs: {
    [requirement: string]: string;
  };
  desc: string;
  desc_notes: string;
  gen_eds: string;
  min_credits: number | null;
  max_credits: number | null;
  sections: Section[];
}

export interface ProfessorGPA {
  slug: string | null;
  rating: number | null;
  gpa: number | null;
  students: number | null;
}

export type Day = "M" | "Tu" | "W" | "Th" | "F" | "Other";

export interface TimeBlock {
  course: Course;
  section: Section;
  meeting: Meeting;
  day: Day;
  start: number;
  end: number;
}

export interface Schedule {
  id: string;
  name: string;
  semester: string;
  sections: [Course, Section][];
  colorMap: {[section: string]: number};
}
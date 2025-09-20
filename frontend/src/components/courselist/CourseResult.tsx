import styles from "./courselist.module.css";

import { Section } from "../../types/api";
import { CourseResultComponent } from "./courselist.types";
import SectionResult from "./SectionResult";
import { Collapse } from "@mantine/core";
import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { AppContext } from "../app/App";

const CourseResult: CourseResultComponent = ({
  course,
  selectedSections,
  onSectionSelect,
}) => {
  let sectionClick: (section: Section) => void = (section) => {
    if (
      !!selectedSections.find(
        (s) => s[0]._id == course._id && s[1].section_id == section.section_id
      )
    ) {
      toast.error("Section Removed");
    } else {
      toast.success("Section Added");
    }
    requestAnimationFrame(() => {
      onSectionSelect(course, section);
    });
    
  };

  let appContext = useContext(AppContext);

  let [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.course}>
      <div className={styles.courseInfo}>
        <div className={styles.courseHeader}>
          <span className={styles.courseID} title="View on Testudo">
            <a href={`https://app.testudo.umd.edu/soc/search?courseId=${course._id}&sectionId=&termId=${appContext?.currentSchedSem}&_openSectionsOnly=on&creditCompare=&credits=&courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on&_online=on&courseStartCompare=&courseStartHour=&courseStartMin=&courseStartAM=&courseEndHour=&courseEndMin=&courseEndAM=&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on&_classDay4=on&_classDay5=on`}
              target="_blank" rel="noopener noreferrer"
            >
              {course._id}
              <i className={`${styles.linkable} fa-solid fa-arrow-up-right-from-square`}></i>
            </a>
          </span>
          
          <span className={styles.courseCredits}>
            {course.min_credits}
            {course.max_credits ? "-" + course.max_credits : ""} credits
          </span>
        </div>
        <span className={styles.courseName}>{course.name}</span>

        <Collapse in={expanded}>
          <div className={styles.courseCollapse}>
            {course.gen_eds ? (
              <span className={styles.courseNote}>
                <strong>GenEd: </strong>
                {course.gen_eds}
              </span>
            ) : null}
            {Object.entries(course.reqs).map(([req, msg]) => (
              <span key={req} className={styles.courseNote}>
                <strong>{req}: </strong>
                {msg}
              </span>
            ))}
            <span className={styles.courseDesc}>
              {course.desc}
              {"\n\n" + course.desc_notes}
            </span>
          </div>
        </Collapse>

        <span
          className={styles.expandBtn}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Less" : "More"} Info
        </span>
      </div>

      <div>
        {course.sections.map((section) => (
          <SectionResult
            key={section.section_id}
            onclick={sectionClick}
            section={section}
            course={course}
            selectedSections={selectedSections}
          />
        ))}
      </div>
    </div>
  );
};

export default CourseResult;

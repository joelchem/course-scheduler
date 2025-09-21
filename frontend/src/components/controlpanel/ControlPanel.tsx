import { useContext, useRef, useState } from "react";
import styles from "./controlpanel.module.css";
import { AppContext } from "../app/App";
import { Button, Collapse, Divider, LoadingOverlay, Modal } from "@mantine/core";
import { createSchedule, deleteSchedule, getScheduleList, saveSchedule } from "../app/storage";
import SectionComponent from "./SectionComponent";
import axios from "axios";

function ControlPanel() {

    let appContext = useContext(AppContext);

    let [nameDropdownToggled, setNameDropdownToggle] = useState<boolean>(false);
    let [urlModal, setUrlModal] = useState<boolean>(false);
    let [urlLoading, setUrlLoading] = useState<boolean>(false);
    let [url, setUrl] = useState<string>("");
    let urlRef = useRef<HTMLTextAreaElement | null>(null);

    let minCredits = 0;
    let maxCredits = 0;

    appContext?.selectedSections.forEach(([course]) => {
        minCredits += course.min_credits ? course.min_credits : 0;
        maxCredits += course.max_credits ? course.max_credits : (course.min_credits) ? course.min_credits : 0;
    })

    return (
        <>
            {appContext?.controlPanelToggled ? (
                <div
                    className={styles.exitCapture}
                    onClick={() => appContext?.setControlPanelToggle(false)}
                ></div>
            ) : null}
            <div className={`${styles.root} ${(appContext?.controlPanelToggled) ? styles.rootOpen : ""}`}>
                <Modal
                    opened={urlModal}
                    onClose={() => setUrlModal(false)}
                    title="Share Link"
                    removeScrollProps={{ enabled: false }}
                    classNames={{ content: styles.urlModalRoot, header: styles.urlModalRoot, title: styles.urlModalTitle }}
                >
                    <LoadingOverlay visible={urlLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ color: "#fe4d4d" }} />
                    <span ref={urlRef} className={styles.url}>{url}</span>
                    {/* <button className={styles.urlCopyBtn} onClick={() => {urlRef.current?.select()}}>Copy</button> */}
                    {/* <Popover position="bottom" withArrow shadow="md">
                    <Popover.Target>
                        
                    </Popover.Target>
                    <Popover.Dropdown>
                        Link Copied
                    </Popover.Dropdown>
                </Popover> */}
                </Modal>
                <div className={`${styles.saveButtonsContainer}`}>
                    <Button
                        classNames={{ label: styles.btnLabel, root: styles.btn }}
                        leftSection={<i className="fa-solid fa-link"></i>}
                        onClick={() => {
                            setUrlModal(true);
                            setUrlLoading(true);

                            let sections = appContext?.selectedSections.map(([course, section]) => {
                                return course._id + "-" + section.section_id
                            })

                            axios.post("https://api.scheduleterp.com/schedule/upload", {
                                semester: appContext?.currentSchedSem,
                                sections,
                                colors: sections?.map((sec) => appContext?.colorMap[sec])
                            }).then((resp) => {
                                if (resp.data.success) {
                                    setUrl("http://" + window.location.host + "/share/" + resp.data.id);

                                } else {
                                    setUrl("Error: " + resp.data.error);
                                }
                                setUrlLoading(false);
                            });
                        }}
                    >Share Link</Button>
                    <Button
                        classNames={{ label: styles.btnLabel, root: styles.btn }}
                        leftSection={<i className="fa-regular fa-calendar"></i>}
                        onClick={() => alert("Export to calendar is coming soon....")}
                    >Export Calendar</Button>

                </div>
                <div className={styles.scheduleSelectContainer}>
                    <i
                        className={`${styles.dropdownIcon} fa-solid fa-caret-${nameDropdownToggled ? "down" : "right"}`}
                        onClick={() => setNameDropdownToggle(last => !last)}
                    ></i>
                    <input
                        className={styles.nameEditBox}
                        value={appContext?.currentScheduleName}
                        onChange={e => appContext?.setCurrentScheduleName(e.target.value.substring(0, 32))}
                        onBlur={() => appContext?.setCurrentScheduleName(last => last.trim() ? last : "Unnamed Schedule")}
                    ></input>
                    <i
                        className={`${styles.addBtn} fa-solid fa-plus`}
                        onClick={() => {
                            createSchedule().then(sched => {
                                let id = sched.id;

                                saveSchedule(sched);
                                appContext?.setCurrentScheduleID(id);
                                setNameDropdownToggle(true);
                            });
                        }}></i>
                </div>
                <Collapse className={styles.otherSchedulesContainer} in={nameDropdownToggled}>
                    {
                        appContext?.schedulesList.map(schedule => ((schedule.id == appContext.currentScheduleID) ? null :
                            <div className={styles.otherSchedules}
                                key={schedule.id}>
                                <span className={styles.otherScheduleTitle}
                                    onClick={() => appContext.setCurrentScheduleID(schedule.id)}
                                >{schedule.name}</span>
                                <i className={`${styles.deleteScheduleBtn} fa-solid fa-trash`}
                                    onClick={() => {
                                        let confirm = window.confirm(`Are you sure you want to delete \"${schedule.name}\"?`);
                                        if (!confirm) { return; };
                                        deleteSchedule(schedule.id);
                                        appContext.setSchedulesList(() => getScheduleList());
                                    }}></i>
                            </div>
                        ))
                    }
                </Collapse>
                <Divider my="sm" color="var(--mantine-color-gray-7)" />
                <span className={styles.credits}>Credits: {minCredits}{(maxCredits > minCredits) ? "-" + maxCredits : ""}</span>
                <div className={styles.sectionsContainer}>
                    {appContext?.selectedSections.map(section =>
                        <SectionComponent key={section[0]._id + section[1].section_id + appContext?.currentScheduleID}
                            section={section} />)}
                </div>


            </div>
        </>

    )
}

export default ControlPanel;
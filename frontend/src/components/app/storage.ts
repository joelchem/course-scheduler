
/*
active: active schedule
totalCreated: 0;
schedules: {
    id: Schedule
}

*/
import { Schedule } from "../../types/api";
import axios from "axios";

export function saveSchedule(schedule: Schedule) {
    // Save a schedule to storage
    let stored = localStorage.getItem("schedules");
    if(!stored) {
        localStorage.setItem("schedules", JSON.stringify({}))
        stored = "{}";
    }
    let schedules: {[id: string]: Schedule} = JSON.parse(stored);

    schedules[schedule.id] = schedule;

    localStorage.setItem("schedules", JSON.stringify(schedules))
}

export function getSchedule(id: string): Schedule | null {

    let stored = localStorage.getItem("schedules");
    if(!stored) {
        return null;
    }
    let schedules: {[id: string]: Schedule} = JSON.parse(stored);
    if(id in schedules) {
        
        if(!schedules[id].colorMap) {
            schedules[id].colorMap = {};
        }
        if(!schedules[id].semester) {
            schedules[id].semester = "202508"
        }

        return schedules[id];
    }
    return null;
}

export async function createSchedule(): Promise<Schedule> {
    let stored = localStorage.getItem("totalCreated");
    let n = (stored) ? parseInt(stored) : 0;

    let semester: string = await axios.get("http://api.scheduleterp.com/latest-semester")
                    .then(resp => resp.data.latest ?? alert("Error: Couldn't determine semester"))
                    .catch(err => {
                        console.error(err);
                        alert("Error: Couldn't access server to determine semester")
                    });

    let term = (semester.substring(4) == "01") ? "Spring" : "Fall";
    let year = semester.substring(0,4);
    let fmtSemester = `${term} ${year}`;

    let newSchedule: Schedule = {
        id: crypto.randomUUID(),
        name: `${fmtSemester} [${n+1}]`,
        sections: [],
        colorMap: {},
        semester: semester
    }

    localStorage.setItem("totalCreated", `${n+1}`)
    return newSchedule;
}

export async function getActiveSchedule(): Promise<Schedule> {

    // Ensure there is an active schedule (if there isn't create one)
    let activeID = localStorage.getItem("active");
    if(activeID) {
        let activeSchedule = getSchedule(activeID);
        if(activeSchedule) {
            return activeSchedule;
        }
    }

    let scheduleList = getScheduleList();
    if(scheduleList.length > 0) {
        setActiveSchedule(scheduleList[0].id);
        return scheduleList[0];
    }

    let newSchedule = await createSchedule();

    saveSchedule(newSchedule);
    setActiveSchedule(newSchedule.id);
    return newSchedule;
}

export function deleteSchedule(id: string) {
    let stored = localStorage.getItem("schedules");
    if(!stored) {
        localStorage.setItem("schedules", JSON.stringify({}))
        stored = "{}";
    }
    
    let schedules: {[id: string]: Schedule} = JSON.parse(stored);
    let {[id]: string, ...rest} = schedules;
    localStorage.setItem("schedules", JSON.stringify(rest));
}

export function setActiveSchedule(id: string) {
    localStorage.setItem("active", id);
}

export function getScheduleList(): Schedule[] {
    let stored = localStorage.getItem("schedules");
    if(!stored) {
        localStorage.setItem("schedules", JSON.stringify({}))
        stored = "{}";
    }
    let schedules: {[id: string]: Schedule} = JSON.parse(stored);
    return Object.values(schedules);
}
import { createDoc, listDocs, updateDoc, Q } from "./appwrite.js";
import { rangesOverlap, getScheduleStatus, getTodayBoundsIST } from "./time.js";

export async function createSchedule(env, { lineId, startAt, endAt, notes, createdBy }) {
  return createDoc(env, env.APPWRITE_COLL_SCHEDULES, {
    lineId,
    startAt,
    endAt,
    status: "upcoming",
    notes: notes || null,
    createdBy,
  });
}

export async function getOverlappingSchedules(env, lineId, startAt, endAt) {
  const activeSchedules = await listDocs(env, env.APPWRITE_COLL_SCHEDULES, [
    Q.equal("lineId", lineId),
    Q.notEqual("status", "done"),
  ]);

  return activeSchedules.filter((s) =>
    rangesOverlap(s.startAt, s.endAt, startAt, endAt)
  );
}

export async function getTodaySchedules(env) {
  const { startOfDay, endOfDay } = getTodayBoundsIST();

  return listDocs(env, env.APPWRITE_COLL_SCHEDULES, [
    Q.greaterEqual("startAt", startOfDay),
    Q.lessThan("startAt", endOfDay),
    Q.orderAsc("startAt"),
  ]);
}

export async function updateScheduleStatus(env, scheduleId, status) {
  return updateDoc(env, env.APPWRITE_COLL_SCHEDULES, scheduleId, { status });
}

export async function refreshScheduleStatuses(env, schedules) {
  const updates = [];
  for (const s of schedules) {
    const currentStatus = getScheduleStatus(s.startAt, s.endAt);
    if (s.status !== currentStatus) {
      updates.push({ id: s.$id, from: s.status, to: currentStatus });
      await updateScheduleStatus(env, s.$id, currentStatus);
    }
  }
  return updates;
}

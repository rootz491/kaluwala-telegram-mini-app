const IST_TZ = "Asia/Kolkata";

export function nowIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: IST_TZ })
  );
}

export function formatIST(date) {
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTimeIST(date) {
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getTodayBoundsIST() {
  const now = nowIST();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
  };
}

export function parseTimeToTodayISO(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: ${timeStr}`);
  }

  const now = nowIST();
  const result = new Date(now);
  result.setHours(hours, minutes, 0, 0);

  return result.toISOString();
}

export function parseTimeRangeToISO(rangeStr) {
  const match = rangeStr.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time range format: ${rangeStr}. Use HH:MM-HH:MM`);
  }

  const startAt = parseTimeToTodayISO(match[1]);
  const endAt = parseTimeToTodayISO(match[2]);

  // Validate end is after start
  if (new Date(endAt) <= new Date(startAt)) {
    throw new Error(`End time must be after start time: ${rangeStr}`);
  }

  return { startAt, endAt };
}

export function rangesOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  return s1 < e2 && s2 < e1;
}

export function getScheduleStatus(startAt, endAt) {
  const now = Date.now();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (now < start) return "upcoming";
  if (now >= start && now < end) return "ongoing";
  return "done";
}

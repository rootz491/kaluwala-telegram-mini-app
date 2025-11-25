import { sendMessage } from "../../services/telegram/index.js";
import { getTodaySchedules, refreshScheduleStatuses } from "../../services/schedules.js";
import { getLineById } from "../../services/lines.js";
import { formatTimeIST } from "../../services/time.js";

export async function handleTodayCommand(message, env) {
  const chatId = message.chat?.id;

  const reply = (msg) => sendMessage(env.BOT_TOKEN, { chat_id: chatId, text: msg, parse_mode: "HTML" });

  const schedules = await getTodaySchedules(env);

  if (!schedules || schedules.length === 0) {
    return reply("📅 No water schedules for today.");
  }

  // Refresh statuses based on current time
  await refreshScheduleStatuses(env, schedules);

  // Group by line
  const byLine = {};
  for (const s of schedules) {
    if (!byLine[s.lineId]) {
      byLine[s.lineId] = [];
    }
    byLine[s.lineId].push(s);
  }

  // Build message
  const lines = [];
  for (const lineId of Object.keys(byLine)) {
    const line = await getLineById(env, lineId);
    const lineName = line?.name || "Unknown Line";

    const entries = byLine[lineId].map((s) => {
      const start = formatTimeIST(s.startAt);
      const end = formatTimeIST(s.endAt);
      const badge = s.status === "ongoing" ? "🟢" : s.status === "upcoming" ? "🔵" : "⚪";
      const notes = s.notes ? ` — ${s.notes}` : "";
      return `  ${badge} ${start} - ${end}${notes}`;
    });

    lines.push(`<b>${lineName}</b>\n${entries.join("\n")}`);
  }

  const header = "📅 <b>Today's Water Schedule</b>\n🟢 ongoing  🔵 upcoming  ⚪ done\n";
  return reply(header + "\n" + lines.join("\n\n"));
}

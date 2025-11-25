import { sendMessage } from "../../services/telegram/index.js";
import { requireDistributorOrAdmin } from "../../services/users.js";
import { resolveLineByNameOrId } from "../../services/lines.js";
import { createSchedule, getOverlappingSchedules } from "../../services/schedules.js";
import { parseTimeRangeToISO, formatTimeIST } from "../../services/time.js";

export async function handleWaterCommand(message, env) {
  const chatId = message.chat?.id;
  const userId = message.from?.id;
  const text = message.text || "";

  const reply = (msg) => sendMessage(env.BOT_TOKEN, { chat_id: chatId, text: msg, parse_mode: "HTML" });

  // Check permission
  try {
    await requireDistributorOrAdmin(env, userId);
  } catch {
    return reply("❌ Permission denied. Only distributors and admins can schedule water.");
  }

  // Parse: /water <line> <HH:MM-HH:MM> [notes]
  const parts = text.replace(/^\/water\s*/i, "").trim().split(/\s+/);
  if (parts.length < 2) {
    return reply("Usage: <code>/water &lt;line&gt; &lt;HH:MM-HH:MM&gt; [notes]</code>\nExample: <code>/water Line 1 07:00-09:00 Morning supply</code>");
  }

  // Find line name (could be "Line 1" or "Line1")
  let lineName = parts[0];
  let timeStr = parts[1];
  let notesStart = 2;

  // Handle "Line 1" as two parts
  if (parts[0].toLowerCase() === "line" && parts.length >= 3) {
    lineName = `${parts[0]} ${parts[1]}`;
    timeStr = parts[2];
    notesStart = 3;
  }

  const notes = parts.slice(notesStart).join(" ") || null;

  // Resolve line
  const line = await resolveLineByNameOrId(env, lineName);
  if (!line) {
    return reply(`❌ Line "<b>${lineName}</b>" not found.`);
  }

  // Parse time range
  let startAt, endAt;
  try {
    ({ startAt, endAt } = parseTimeRangeToISO(timeStr));
  } catch (err) {
    return reply(`❌ ${err.message}`);
  }

  // Check overlaps
  const overlaps = await getOverlappingSchedules(env, line.$id, startAt, endAt);
  if (overlaps.length > 0) {
    const existing = overlaps.map((o) => `• ${formatTimeIST(o.startAt)} - ${formatTimeIST(o.endAt)}`).join("\n");
    return reply(`❌ Schedule overlaps with existing:\n${existing}`);
  }

  // Create schedule
  await createSchedule(env, {
    lineId: line.$id,
    startAt,
    endAt,
    notes,
    createdBy: userId,
  });

  const startTime = formatTimeIST(startAt);
  const endTime = formatTimeIST(endAt);
  return reply(`✅ Scheduled water for <b>${line.name}</b>\n🕐 ${startTime} - ${endTime}${notes ? `\n📝 ${notes}` : ""}`);
}

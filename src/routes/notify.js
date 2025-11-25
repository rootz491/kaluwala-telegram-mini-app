import { sendMessage } from "../services/telegram/index.js";
import { getSubscribersForLine } from "../services/lineSubscribers.js";
import { getLineById } from "../services/lines.js";

export async function handleNotifyWebhook(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Verify shared secret
  const secret = request.headers.get("X-Notify-Secret");
  if (!secret || secret !== env.NOTIFY_SHARED_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { lineId, event, text } = body;

  if (!lineId || !event) {
    return new Response("Missing lineId or event", { status: 400 });
  }

  const line = await getLineById(env, lineId);
  const lineName = line?.name || "Unknown Line";

  const subscribers = await getSubscribersForLine(env, lineId);
  if (!subscribers || subscribers.length === 0) {
    return Response.json({ sent: 0, message: "No subscribers for this line" });
  }

  const emoji = event === "on" ? "🟢" : "🔴";
  const status = event === "on" ? "Water is now available" : "Water supply ended";
  const message = text || `${emoji} <b>${lineName}</b>\n${status}`;

  let sent = 0;
  let failed = 0;

  for (const telegramId of subscribers) {
    try {
      await sendMessage(env.BOT_TOKEN, {
        chat_id: telegramId,
        text: message,
        parse_mode: "HTML",
      });
      sent++;
    } catch (err) {
      console.error(`Notify: Failed to send to ${telegramId}:`, err);
      failed++;
    }
  }

  return Response.json({ sent, failed, total: subscribers.length });
}

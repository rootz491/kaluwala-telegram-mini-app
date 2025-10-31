/**
 * telegramService - low-level Telegram API helpers
 */
export async function sendMessage(botToken, payload) {
  if (!botToken) throw new Error("BOT_TOKEN not configured");

  const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`Telegram API error ${resp.status}: ${text}`);
  }

  return resp.json().catch(() => null);
}

export async function answerCallbackQuery(botToken, callbackQueryId, text = null, showAlert = false) {
  if (!botToken) throw new Error("BOT_TOKEN not configured");
  const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/answerCallbackQuery`;
  const body = { callback_query_id: callbackQueryId };
  if (text) body.text = String(text);
  if (showAlert) body.show_alert = true;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "<no body>");
    throw new Error(`Telegram API error ${resp.status}: ${t}`);
  }

  return resp.json().catch(() => null);
}

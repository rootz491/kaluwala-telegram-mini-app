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

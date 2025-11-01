/**
 * telegramService - low-level Telegram API helpers
 */
export async function sendMessage(botToken, payload) {
  if (!botToken) throw new Error("BOT_TOKEN not configured");

  const url = `https://api.telegram.org/bot${encodeURIComponent(
    botToken
  )}/sendMessage`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`Telegram API error ${resp.status}: ${text}`);
  }

  return resp.json().catch(() => null);
}

export async function sendPhoto(botToken, payload) {
  if (!botToken) throw new Error("BOT_TOKEN not configured");

  const url = `https://api.telegram.org/bot${encodeURIComponent(
    botToken
  )}/sendPhoto`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`Telegram API error ${resp.status}: ${text}`);
  }

  return resp.json().catch(() => null);
}

export async function answerCallbackQuery(
  botToken,
  callbackQueryId,
  text = null,
  showAlert = false
) {
  if (!botToken) throw new Error("BOT_TOKEN not configured");
  const url = `https://api.telegram.org/bot${encodeURIComponent(
    botToken
  )}/answerCallbackQuery`;
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

/**
 * Validate if a chat ID is accessible by the bot.
 * Uses Telegram getChat API to check if the user/chat exists and the bot can interact with it.
 * Returns true if valid, false otherwise.
 */
export async function validateChatId(botToken, chatId) {
  if (!botToken) throw new Error("BOT_TOKEN not configured");
  const url = `https://api.telegram.org/bot${encodeURIComponent(
    botToken
  )}/getChat`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });

    if (!resp.ok) {
      // 400 or 403 means invalid/inaccessible chat
      return false;
    }

    const result = await resp.json().catch(() => null);
    return !!(result && result.ok && result.result);
  } catch (err) {
    console.warn("validateChatId: error calling getChat:", err);
    return false;
  }
}

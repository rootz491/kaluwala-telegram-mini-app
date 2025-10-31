/**
 * Cloudflare Worker to handle Telegram webhook updates and respond to /start
 * Sends an inline keyboard button that opens a Web App (your blog) inside Telegram.
 *
 * Environment variables (set via `wrangler secret put`):
 * - BOT_TOKEN (required): Telegram bot token (123456:ABC-...)
 * - WEBHOOK_SECRET (optional): secret token to verify incoming webhook header
 * - BLOG_URL (optional): URL to open in Telegram Web App (defaults to https://myblog.example.com)
 *
 * No external Node modules used — only standard Cloudflare Worker APIs.
 */

export default {
  // `fetch` is the entry point for Module Workers. It receives (request, env, ctx).
  async fetch(request, env) {
    // Simple health-check for GET requests
    if (request.method === "GET") {
      return new Response("Telegram MiniApp Worker: OK", { status: 200 });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Optional webhook secret verification. If you've set a WEBHOOK_SECRET
    // in your environment, Telegram will send it in the header
    // `X-Telegram-Bot-Api-Secret-Token` when you configured setWebhook with secret_token.
    const expectedSecret = env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const incoming = request.headers.get("x-telegram-bot-api-secret-token") || "";
      if (!incoming || incoming !== expectedSecret) {
        console.warn("Invalid or missing webhook secret");
        return new Response("Forbidden", { status: 403 });
      }
    }

    let update;
    try {
      update = await request.json();
    } catch (err) {
      console.error("Failed to parse JSON body:", err);
      return new Response("Bad Request", { status: 400 });
    }

    // Support common update shapes: message, edited_message, callback_query
    const message =
      update.message || update.edited_message || (update.callback_query && update.callback_query.message);

    if (!message) {
      // Nothing for us to do — acknowledge the update
      return new Response("ok", { status: 200 });
    }

    const text = (message.text || "").trim();

    // Handle /start command (including possible arguments like `/start abc`)
    if (text.toLowerCase().startsWith("/start")) {
      try {
        await handleStartCommand(message, env);
      } catch (err) {
        console.error("Error handling /start:", err);
        // Return 200 so Telegram won't keep retrying; errors are logged
      }
    }

    return new Response("ok", { status: 200 });
  }
};

/**
 * handleStartCommand - send a welcome message with an InlineKeyboard button
 * that opens the blog inside Telegram's Web App view.
 */
async function handleStartCommand(message, env) {
  const botToken = env.BOT_TOKEN;
  if (!botToken) {
    console.error("BOT_TOKEN not configured in environment");
    return;
  }

  const chatId = message.chat && message.chat.id;
  if (!chatId) {
    console.warn("No chat id found on message");
    return;
  }

  // BLOG_URL can be overridden with an env secret/variable if desired
  const blogUrl = env.BLOG_URL || "https://kaluwala.in";

  const text =
    "View Kaluwala insights inside the Telegram app.";

  // Build inline keyboard with a Web App button and fallback url.
  // The `web_app` field opens the page inside Telegram Web App (if client supports it).
  // The `url` field is provided as a fallback for clients that do not support web_app.
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "Open Blog",
          web_app: { url: blogUrl }
        }
      ]
    ]
  };

  const payload = {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    parse_mode: "HTML"
  };

  await telegramAPICall(botToken, "sendMessage", payload);
}

/**
 * telegramAPICall - helper to call Telegram Bot API
 */
async function telegramAPICall(botToken, method, bodyObj) {
  const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/${method}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(bodyObj)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<failed to read body>");
    throw new Error(`Telegram API error ${resp.status}: ${text}`);
  }

  return resp.json().catch(() => null);
}

import { parseJson } from "../utils/http.js";
import {
  sendMessage,
  answerCallbackQuery,
} from "../services/telegram/index.js";
import { addSubscriber, isSubscribed } from "../services/subscribers/index.js";

/**
 * handleTelegramUpdate - process incoming Telegram webhook updates.
 * - Parses the JSON body
 * - Verifies optional webhook secret (handled upstream if needed)
 * - Routes commands (/start, /subscribe)
 */
export async function handleTelegramUpdate(request, env) {
  // Optional header verification for Telegram webhook secret is performed in the
  // Worker entrypoint if desired. Here we focus on update handling.

  let update;
  try {
    update = await parseJson(request);
  } catch (err) {
    console.error("Telegram: failed to parse JSON:", err);
    return new Response("Bad Request", { status: 400 });
  }

  const message =
    update.message ||
    update.edited_message ||
    (update.callback_query && update.callback_query.message);
  if (!message) return new Response("ok", { status: 200 });

  const text = (message.text || "").trim();
  const chatId = message.chat && message.chat.id;

  if (!chatId) return new Response("ok", { status: 200 });

  if (text.toLowerCase().startsWith("/start")) {
    const telegramPageUrl = `${env.BLOG_URL || "https://kaluwala.in"}/telegram`;
    const homePageUrl = env.BLOG_URL || "https://kaluwala.in";

    // If the user is already subscribed, open the home page directly; otherwise open the Telegram-specific page
    let openUrl = telegramPageUrl;
    try {
      const subscribed = await isSubscribed(chatId, env);
      if (subscribed) openUrl = homePageUrl;
    } catch (err) {
      console.warn(
        "Telegram: isSubscribed check failed, defaulting to telegramPageUrl",
        err
      );
    }

    const payload = {
      chat_id: chatId,
      text: "View Kaluwala insights inside the Telegram app.",
      reply_markup: {
        inline_keyboard: [[{ text: "Open Blog", web_app: { url: openUrl } }]],
      },
    };

    try {
      await sendMessage(env.BOT_TOKEN, payload);
    } catch (err) {
      console.error("Telegram: sendMessage failed on /start:", err);
    }

    return new Response("ok", { status: 200 });
  }

  if (text.toLowerCase().startsWith("/subscribe")) {
    try {
      const result = await addSubscriber(
        {
          chatId,
          first_name: message.chat.first_name,
          username: message.chat.username,
        },
        env
      );

      let reply;
      if (result.error === "invalid_user") {
        reply =
          "Sorry, we couldn't verify your Telegram account. Please try again later.";
      } else if (result.persisted) {
        reply =
          "You're subscribed to blog updates! We'll notify you when a new post is published.";
      } else {
        reply =
          "You're subscribed (ephemeral). To persist subscriptions across deploys, configure a Cloudflare KV namespace or D1 database binding.";
      }

      await sendMessage(env.BOT_TOKEN, { chat_id: chatId, text: reply });
    } catch (err) {
      console.error("Telegram: subscribe failed:", err);
    }

    return new Response("ok", { status: 200 });
  }

  // Not a command we handle — acknowledge
  return new Response("ok", { status: 200 });
}

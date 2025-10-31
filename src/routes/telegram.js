import { parseJson } from "../utils/http.js";
import { sendMessage } from "../services/telegramService.js";
import { addSubscriber } from "../services/subscribers/index.js";

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

  // Handle Web App sendData payload (message.web_app_data.data)
  if (message.web_app_data && message.web_app_data.data) {
    try {
      const dataStr = message.web_app_data.data;
      let payloadObj;
      try {
        payloadObj = JSON.parse(dataStr);
      } catch (e) {
        payloadObj = { raw: dataStr };
      }

      if (payloadObj && payloadObj.action === "subscribe") {
        const chatIdInner = message.chat && message.chat.id;
        if (chatIdInner) {
          await addSubscriber(
            {
              chatId: chatIdInner,
              first_name: message.chat.first_name,
              username: message.chat.username,
            },
            env
          );
          await sendMessage(env.BOT_TOKEN, {
            chat_id: chatIdInner,
            text: "Thanks — you're subscribed to blog updates! We'll send a message when a new post is published.",
          });
        }
      }
    } catch (err) {
      console.error("Error handling web_app_data:", err);
    }

    return new Response("ok", { status: 200 });
  }

  const text = (message.text || "").trim();
  const chatId = message.chat && message.chat.id;

  if (!chatId) return new Response("ok", { status: 200 });

  if (text.toLowerCase().startsWith("/start")) {
    // reply with WebApp button (service handles formatting)
    const blogUrl = env.BLOG_URL || "https://kaluwala.in";
    const payload = {
      chat_id: chatId,
      text: "View Kaluwala insights inside the Telegram app.",
      reply_markup: {
        inline_keyboard: [[{ text: "Open Blog", web_app: { url: blogUrl } }]],
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
      const reply = result.persisted
        ? "You're subscribed to blog updates! We'll notify you when a new post is published."
        : "You're subscribed (ephemeral). To persist subscriptions across deploys, configure a Cloudflare KV namespace or D1 database binding.";

      await sendMessage(env.BOT_TOKEN, { chat_id: chatId, text: reply });
    } catch (err) {
      console.error("Telegram: subscribe failed:", err);
    }

    return new Response("ok", { status: 200 });
  }

  // Not a command we handle — acknowledge
  return new Response("ok", { status: 200 });
}

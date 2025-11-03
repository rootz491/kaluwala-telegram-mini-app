import { sendMessage } from "../../services/telegram/index.js";
import { isSubscribed } from "../../services/subscribers/index.js";

/**
 * Handle /start command
 * Shows a button to open the blog in Telegram Web App.
 * Opens different URLs based on subscription status.
 */
export async function handleStartCommand(message, env) {
  const chatId = message.chat?.id;
  if (!chatId) {
    console.warn("Start: No chat ID found in message");
    return;
  }

  const telegramPageUrl = `${env.BLOG_URL || "https://kaluwala.in"}/telegram`;
  const homePageUrl = env.BLOG_URL || "https://kaluwala.in";

  let openUrl = telegramPageUrl;
  let subscribed = false;
  try {
    subscribed = await isSubscribed(chatId, env);
    if (subscribed) {
      openUrl = homePageUrl;
    }
  } catch (err) {
    console.warn(
      "Start: isSubscribed check failed, defaulting to telegramPageUrl",
      err
    );
  }

  const payload = {
    chat_id: chatId,
    text: "Welcome! Explore Kaluwala insights inside the Telegram app.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open in Telegram", web_app: { url: openUrl } }],
        [{ text: "Open in Web", url: openUrl }],
        ...(subscribed ? [] : [[{ text: "Subscribe", web_app: { url: telegramPageUrl } }]]),
      ],
    },
  };

  try {
    await sendMessage(env.BOT_TOKEN, payload);
  } catch (err) {
    console.error("Start: sendMessage failed:", err);
    throw err;
  }
}

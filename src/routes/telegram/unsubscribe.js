import { sendMessage } from "../../services/telegram/index.js";
import { removeSubscriber } from "../../services/subscribers/index.js";

/**
 * Handle /unsubscribe command
 * Unsubscribes the user from blog updates and sends a farewell message.
 * RESTRICTED: Only works in DM (chat type "private")
 */
export async function handleUnsubscribeCommand(message, env) {
  const chatId = message.chat?.id;
  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    console.error("Unsubscribe: BOT_TOKEN not configured");
    return;
  }

  if (!chatId) {
    console.warn("Unsubscribe: No chat ID found in message");
    return;
  }

  try {
    const result = await removeSubscriber(chatId, env);

    let reply;
    if (result.error === "not_subscribed") {
      reply = "You're not currently subscribed to our blog updates. 😊";
    } else if (result.persisted) {
      reply =
        "We've removed you from our subscriber list. 👋\n\nFeel free to /subscribe anytime if you change your mind. We'd love to have you back!";
    } else {
      reply = "You've been unsubscribed from blog updates.";
    }

    await sendMessage(botToken, {
      chat_id: chatId,
      text: reply,
    });

    console.log(`Unsubscribe: User ${chatId} unsubscribed`);
  } catch (err) {
    console.error("Unsubscribe: Failed to remove subscriber:", err);
    await sendMessage(botToken, {
      chat_id: chatId,
      text: "❌ Sorry, something went wrong while unsubscribing. Please try again later.",
    }).catch((sendErr) => console.warn("Unsubscribe: failed to send error message:", sendErr));
  }
}

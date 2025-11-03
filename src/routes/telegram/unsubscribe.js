import { sendMessage } from "../../services/telegram/index.js";
import { removeSubscriber } from "../../services/subscribers/index.js";
import { messages } from "../../services/messages.js";

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
      reply = messages.unsubscribe.notSubscribed;
    } else if (result.persisted) {
      reply = messages.unsubscribe.farewell;
    } else {
      reply = messages.unsubscribe.farewell;
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
      text: messages.unsubscribe.error,
    }).catch((sendErr) => console.warn("Unsubscribe: failed to send error message:", sendErr));
  }
}

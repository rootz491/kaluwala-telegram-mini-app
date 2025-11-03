import { sendMessage } from "../../services/telegram/index.js";
import { addSubscriber } from "../../services/subscribers/index.js";
import { messages } from "../../services/messages.js";

/**
 * Handle /subscribe command
 * Subscribes the user to blog updates and sends confirmation.
 */
export async function handleSubscribeCommand(message, env) {
  const chatId = message.chat?.id;
  if (!chatId) {
    console.warn("Subscribe: No chat ID found in message");
    return;
  }

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
    if (result.error === "already_subscribed") {
      reply = messages.subscribe.already;
    } else if (result.error === "invalid_user") {
      reply = messages.subscribe.error;
    } else if (result.persisted) {
      reply = messages.subscribe.success;
    } else {
      reply = messages.subscribe.ephemeral;
    }

    await sendMessage(env.BOT_TOKEN, { chat_id: chatId, text: reply });
  } catch (err) {
    console.error("Subscribe: Failed to add subscriber:", err);
    throw err;
  }
}

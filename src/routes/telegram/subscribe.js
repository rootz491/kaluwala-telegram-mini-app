import { sendMessage } from "../../services/telegram/index.js";
import { addSubscriber } from "../../services/subscribers/index.js";

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
      reply =
        "You're already subscribed! 😊 Sit back and relax, we'll notify you when new content drops.";
    } else if (result.error === "invalid_user") {
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
    console.error("Subscribe: Failed to add subscriber:", err);
    throw err;
  }
}

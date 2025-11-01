import { sendMessage } from "../../services/telegram/index.js";
import { addSubscriber } from "../../services/subscribers/index.js";

/**
 * Handle web_app_data (data sent from Telegram Web App)
 * Processes subscription requests from the Web App interface.
 */
export async function handleWebAppData(message, env) {
  const dataStr = message.web_app_data?.data;
  if (!dataStr) {
    console.warn("WebAppData: No data found in web_app_data");
    return;
  }

  const chatId = message.chat?.id;
  if (!chatId) {
    console.warn("WebAppData: No chat ID found in message");
    return;
  }

  let payloadObj;
  try {
    payloadObj = JSON.parse(dataStr);
  } catch (e) {
    console.warn("WebAppData: Failed to parse JSON, using raw data:", e);
    payloadObj = { raw: dataStr };
  }

  if (payloadObj?.action === "subscribe") {
    try {
      const result = await addSubscriber(
        {
          chatId,
          first_name: message.chat.first_name,
          username: message.chat.username,
        },
        env
      );

      if (result.error === "already_subscribed") {
        await sendMessage(env.BOT_TOKEN, {
          chat_id: chatId,
          text: "You're already subscribed! 😊 Sit back and relax, we'll notify you when new content drops.",
        });
      } else if (result.error === "invalid_user") {
        await sendMessage(env.BOT_TOKEN, {
          chat_id: chatId,
          text: "Sorry, we couldn't verify your Telegram account. Please try again later.",
        });
      } else {
        await sendMessage(env.BOT_TOKEN, {
          chat_id: chatId,
          text: "Thanks — you're subscribed to blog updates! We'll send a message when a new post is published.",
        });
      }
    } catch (err) {
      console.error("WebAppData: Error handling subscribe action:", err);
      throw err;
    }
  }
}

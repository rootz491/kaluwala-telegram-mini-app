import { sendMessage, answerCallbackQuery } from "../../services/telegram/index.js";
import { addSubscriber } from "../../services/subscribers/index.js";

/**
 * Handle callback_query updates (inline button presses)
 * Processes subscription actions from inline keyboard buttons.
 */
export async function handleCallbackQuery(callbackQuery, env) {
  const callbackId = callbackQuery.id;
  const from = callbackQuery.from || {};
  const chatIdFromMessage =
    (callbackQuery.message?.chat?.id) || from.id;
  const raw = callbackQuery.data || "";

  // Try to parse JSON callback data
  let payloadObj = null;
  try {
    payloadObj = JSON.parse(raw);
  } catch (e) {
    console.error("CallbackQuery: Failed to parse callback data:", e);
    try {
      await answerCallbackQuery(env.BOT_TOKEN, callbackId, "Invalid data", true);
    } catch (err) {
      console.error("CallbackQuery: Failed to answer with error:", err);
    }
    return;
  }

  try {
    // Handle subscribe action
    if (payloadObj?.action === "subscribe") {
      const targetChat = chatIdFromMessage;
      if (!targetChat) {
        await answerCallbackQuery(env.BOT_TOKEN, callbackId, "No chat ID", true);
        return;
      }

      const result = await addSubscriber(
        {
          chatId: targetChat,
          first_name: from.first_name,
          username: from.username,
        },
        env
      );

      if (result.error === "already_subscribed") {
        // User is already subscribed
        try {
          await sendMessage(env.BOT_TOKEN, {
            chat_id: targetChat,
            text: "You're already subscribed! 😊 Sit back and relax, we'll notify you when new content drops.",
          });
          await answerCallbackQuery(
            env.BOT_TOKEN,
            callbackId,
            "Already subscribed",
            false
          );
        } catch (err) {
          console.error("CallbackQuery: Failed to send already subscribed message:", err);
        }
      } else if (result.error === "invalid_user") {
        // Invalid Telegram user ID
        try {
          await sendMessage(env.BOT_TOKEN, {
            chat_id: targetChat,
            text: "Sorry, we couldn't verify your Telegram account. Please try again later.",
          });
          await answerCallbackQuery(
            env.BOT_TOKEN,
            callbackId,
            "Verification failed",
            true
          );
        } catch (err) {
          console.error("CallbackQuery: Failed to send invalid user message:", err);
        }
      } else {
        // Successfully subscribed
        try {
          await sendMessage(env.BOT_TOKEN, {
            chat_id: targetChat,
            text: "Thanks — you're subscribed to blog updates! We'll send a message when a new post is published.",
          });
          await answerCallbackQuery(
            env.BOT_TOKEN,
            callbackId,
            "Subscribed",
            false
          );
        } catch (err) {
          console.error("CallbackQuery: Failed to confirm subscription:", err);
        }
      }
    } else {
      // Unknown callback payload — acknowledge to stop spinner
      await answerCallbackQuery(env.BOT_TOKEN, callbackId, null, false);
    }
  } catch (err) {
    console.error("CallbackQuery: Error handling callback:", err);
    try {
      await answerCallbackQuery(env.BOT_TOKEN, callbackId, "Error", true);
    } catch (e) {
      console.error("CallbackQuery: Failed to answer with error:", e);
    }
  }
}

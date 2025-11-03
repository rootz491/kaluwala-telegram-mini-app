import { sendMessage } from "../../services/telegram/index.js";

/**
 * Handle /chatid command
 * Returns the chat ID of the current conversation
 * Works in both private chats and groups
 */
export async function handleChatIdCommand(message, env) {
  const chatId = message.chat?.id;
  const chatTitle = message.chat?.title || message.chat?.first_name || "Private Chat";
  const chatType = message.chat?.type || "unknown";

  if (!chatId) {
    console.warn("ChatId: No chat ID found in message");
    return;
  }

  const payload = {
    chat_id: chatId,
    text: `ℹ️ <b>Chat Information</b>\n\n🆔 <b>Chat ID:</b> <code>${chatId}</code>\n📝 <b>Chat Title:</b> ${chatTitle}\n📌 <b>Chat Type:</b> ${chatType}`,
    parse_mode: "HTML",
  };

  try {
    await sendMessage(env.BOT_TOKEN, payload);
  } catch (err) {
    console.error("ChatId: sendMessage failed:", err);
    throw err;
  }
}

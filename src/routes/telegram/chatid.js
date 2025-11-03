import { sendMessage } from "../../services/telegram/index.js";
import { messages } from "../../services/messages.js";

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
    text: messages.chatid.format(chatId, chatTitle, chatType),
    parse_mode: "HTML",
  };

  try {
    await sendMessage(env.BOT_TOKEN, payload);
  } catch (err) {
    console.error("ChatId: sendMessage failed:", err);
    throw err;
  }
}

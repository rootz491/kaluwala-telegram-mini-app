import { sendMessage } from "../../services/telegram/index.js";
import { getPendingGalleryImages } from "../../services/sanityImage.js";

/**
 * Handle /pending command
 * Lists all pending gallery images with metadata
 * RESTRICTED: Only works in MODERATION_CHAT_ID
 */
export async function handlePendingCommand(message, env) {
  const chatId = message.chat?.id;
  const moderationChatId = env.MODERATION_CHAT_ID;
  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    console.error("Pending: BOT_TOKEN not configured");
    return;
  }

  // Security check: only allow in moderation chat
  if (moderationChatId && chatId !== Number(moderationChatId)) {
    console.warn(
      `Security: Unauthorized /pending command from chat ${chatId}. Restricted to ${moderationChatId}`
    );
    return; // Silent deny
  }

  try {
    // Fetch pending images
    const pendingImages = await getPendingGalleryImages(env);

    if (!pendingImages || pendingImages.length === 0) {
      await sendMessage(botToken, {
        chat_id: chatId,
        text: "✅ No pending images at the moment. Gallery is all caught up!",
      });
      return;
    }

    // Build message with pending images list
    let messageText = `📋 <b>Pending Gallery Submissions</b>\n\nTotal: <b>${pendingImages.length}</b> pending image(s)\n\n`;

    pendingImages.forEach((img, index) => {
      const userName = img.firstName || "Unknown";
      const userHandle = img.username ? `@${img.username}` : `User ${img.telegramId}`;
      const uploadDate = img._createdAt ? new Date(img._createdAt).toLocaleString() : "Unknown";
      const docId = img._id || "N/A";

      messageText += `<b>${index + 1}.</b> ${userName} (${userHandle})\n`;
      messageText += `   📅 Submitted: ${uploadDate}\n`;
      messageText += `   🆔 ID: <code>${docId}</code>\n\n`;
    });

    messageText += `<i>Use the approve/reject buttons to moderate individual submissions.</i>`;

    await sendMessage(botToken, {
      chat_id: chatId,
      text: messageText,
      parse_mode: "HTML",
    });

    console.log(`Pending: Listed ${pendingImages.length} pending images for moderator`);
  } catch (err) {
    console.error("Pending: failed to fetch pending images:", err);
    await sendMessage(botToken, {
      chat_id: chatId,
      text: `❌ Error fetching pending images: ${String(err).substring(0, 100)}`,
    }).catch((sendErr) => console.warn("Pending: failed to send error:", sendErr));
  }
}

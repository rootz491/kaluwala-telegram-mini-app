import { sendMessage, sendPhoto } from "../../services/telegram/index.js";
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

    // Send summary/meta info first
    const summaryText = `📋 <b>Pending Gallery Submissions</b>\n\nTotal: <b>${pendingImages.length}</b> pending image(s) awaiting review`;

    await sendMessage(botToken, {
      chat_id: chatId,
      text: summaryText,
      parse_mode: "HTML",
    });

    // Send one message per pending image with photo and moderation buttons
    for (let i = 0; i < pendingImages.length; i++) {
      const img = pendingImages[i];
      const userName = img.firstName || "Unknown";
      const userHandle = img.username ? `@${img.username}` : `User ${img.telegramId}`;
      const uploadDate = img._createdAt ? new Date(img._createdAt).toLocaleString() : "Unknown";
      const docId = img._id || "N/A";
      const imageUrl = img.image?.asset?.url;

      const imageCaption = `<b>#${i + 1}</b> ${userName} (${userHandle})\n📅 ${uploadDate}\n🆔 <code>${docId}</code>`;

      // Build keyboard with open in browser button and moderation buttons
      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: "🌐 Open in Browser",
              url: imageUrl || "#",
            },
          ],
          [
            { text: "✅ Approve", callback_data: `gallery_approve_${docId}` },
            { text: "❌ Reject", callback_data: `gallery_reject_${docId}` },
          ],
        ],
      };

      try {
        await sendPhoto(botToken, {
          chat_id: chatId,
          photo: imageUrl,
          caption: imageCaption,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        });
      } catch (err) {
        console.warn(`Pending: failed to send image ${i + 1} (${docId}):`, err);
      }
    }

    console.log(`Pending: Listed ${pendingImages.length} pending images for moderator`);
  } catch (err) {
    console.error("Pending: failed to fetch pending images:", err);
    await sendMessage(botToken, {
      chat_id: chatId,
      text: `❌ Error fetching pending images: ${String(err).substring(0, 100)}`,
    }).catch((sendErr) => console.warn("Pending: failed to send error:", sendErr));
  }
}

import { sendMessage, answerCallbackQuery } from "../../services/telegram/index.js";
import { updateGalleryStatus, getGalleryDocument } from "../../services/sanityImage.js";

/**
 * Handle moderation callback queries from approve/reject buttons
 * Callback data format: "gallery_approve_<docId>" or "gallery_reject_<docId>"
 * RESTRICTED: Only works in MODERATION_CHAT_ID
 */
export async function handleModerationCallback(callbackQuery, env) {
  const { id: callbackId, data, from, message } = callbackQuery;
  const botToken = env.BOT_TOKEN;
  const moderatorId = from?.id;
  const moderationChatId = env.MODERATION_CHAT_ID;

  if (!botToken) {
    console.error("Moderation: BOT_TOKEN not configured");
    return;
  }

  // Security check: only allow in moderation chat
  if (moderationChatId && message?.chat?.id !== Number(moderationChatId)) {
    console.warn(
      `Security: Unauthorized moderation attempt from chat ${message?.chat?.id}. Moderation restricted to ${moderationChatId}`
    );
    await answerCallbackQuery(botToken, callbackId, "❌ Unauthorized", true);
    return;
  }

  // Parse callback data
  const [action, ...docIdParts] = data.split("_");
  const docId = docIdParts.join("_"); // rejoin in case docId contains underscores

  if (action !== "gallery_approve" && action !== "gallery_reject") {
    console.warn("Moderation: unknown callback action:", action);
    await answerCallbackQuery(botToken, callbackId, "❌ Unknown action", true);
    return;
  }

  const newStatus = action === "gallery_approve" ? "approved" : "rejected";

  try {
    // Update the gallery document status in Sanity
    await updateGalleryStatus(docId, newStatus, null, env);

    // Answer the callback query with success
    const emoji = newStatus === "approved" ? "✅" : "❌";
    await answerCallbackQuery(botToken, callbackId, `${emoji} Image ${newStatus}!`);

    // Update the message to show it's been moderated
    const messageText = `${emoji} This image has been <b>${newStatus}</b>.\n\n<i>Moderated by user ${moderatorId}</i>`;

    if (message?.message_id && message?.chat?.id) {
      try {
        await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/editMessageText`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id,
            text: messageText,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [] }, // Remove buttons
          }),
        });
      } catch (err) {
        console.warn("Moderation: failed to edit message:", err);
      }
    }

    console.log(`Moderation: ${newStatus} gallery document ${docId} by moderator ${moderatorId}`);

    // Optionally notify the original uploader
    try {
      const galleryDoc = await getGalleryDocument(docId, env);
      if (galleryDoc && galleryDoc.telegramId) {
        const notificationText =
          newStatus === "approved"
            ? "🎉 Great news! Your photo was approved and is now live in the gallery!"
            : "📝 Your photo submission was not approved. You can try uploading another one!";

        await sendMessage(botToken, {
          chat_id: galleryDoc.telegramId,
          text: notificationText,
        });
      }
    } catch (err) {
      console.warn("Moderation: failed to notify uploader:", err);
    }
  } catch (err) {
    console.error("Moderation: update failed:", err);
    await answerCallbackQuery(botToken, callbackId, `❌ Error: ${String(err).substring(0, 50)}`, true);
  }
}

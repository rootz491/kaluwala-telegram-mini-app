import { sendMessage, sendPhoto, answerCallbackQuery } from "../../services/telegram/index.js";
import { updateGalleryStatus, getGalleryDocument, deleteGalleryDocument } from "../../services/sanityImage.js";

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
  // Format: "gallery_approve_<docId>" or "gallery_reject_<docId>"
  let action, docId;
  
  if (data.startsWith("gallery_approve_")) {
    action = "gallery_approve";
    docId = data.substring("gallery_approve_".length);
  } else if (data.startsWith("gallery_reject_")) {
    action = "gallery_reject";
    docId = data.substring("gallery_reject_".length);
  } else {
    console.warn("Moderation: unknown callback action:", data);
    await answerCallbackQuery(botToken, callbackId, "❌ Unknown action", true);
    return;
  }

  const newStatus = action === "gallery_approve" ? "approved" : "rejected";

  try {
    // Check if the document has already been moderated (safety check against duplicate actions)
    const galleryDoc = await getGalleryDocument(docId, env);
    if (!galleryDoc) {
      await answerCallbackQuery(botToken, callbackId, "❌ Image not found", true);
      return;
    }

    // Prevent duplicate actions: if already moderated, reject the action
    if (galleryDoc.status !== "pending") {
      const currentStatus = galleryDoc.status || "unknown";
      await answerCallbackQuery(
        botToken,
        callbackId,
        `⚠️ Already ${currentStatus}. Cannot change decision.`,
        true
      );
      return;
    }

    // Update the gallery document status in Sanity
    await updateGalleryStatus(docId, newStatus, null, env);

    // Answer the callback query with success
    const emoji = newStatus === "approved" ? "✅" : "❌";
    await answerCallbackQuery(botToken, callbackId, `${emoji} Image ${newStatus}!`);

    // Try to delete the message from moderation chat to clean up
    if (message?.message_id && message?.chat?.id) {
      try {
        // First try to delete the message entirely
        await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/deleteMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id,
          }),
        });
        console.log(`Moderation: Deleted moderation message ${message.message_id} from chat ${message.chat.id}`);
      } catch (err) {
        // If deletion fails, fall back to removing buttons by editing the message
        console.warn("Moderation: failed to delete message, attempting to remove buttons:", err);
        try {
          await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/editMessageText`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chat_id: message.chat.id,
              message_id: message.message_id,
              text: `${emoji} This image has been <b>${newStatus}</b>.\n\n<i>Moderated by user ${moderatorId}</i>`,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [] }, // Remove buttons
            }),
          });
        } catch (editErr) {
          console.warn("Moderation: failed to edit message:", editErr);
        }
      }
    }

    console.log(`Moderation: ${newStatus} gallery document ${docId} by moderator ${moderatorId}`);

    // Notify the original uploader
    try {
      const galleryDoc = await getGalleryDocument(docId, env);
      if (galleryDoc && galleryDoc.telegramId) {
        if (newStatus === "approved") {
          // Approval notification
          const imageUrl = galleryDoc.image?.asset?.url;
          const notificationText = "🎉 Great news! Your photo was approved and is now live in the gallery!";
          if (imageUrl) {
            await sendPhoto(botToken, {
              chat_id: galleryDoc.telegramId,
              photo: imageUrl,
              caption: notificationText,
              parse_mode: "HTML",
            });
          } else {
            await sendMessage(botToken, {
              chat_id: galleryDoc.telegramId,
              text: notificationText,
            });
          }
        } else {
          // Rejection notification (with image and contact info)
          const imageUrl = galleryDoc.image?.asset?.url;
          const rejectionCaption =
            "❌ <b>Photo Not Approved</b>\n\n" +
            "Unfortunately, your photo submission did not meet our guidelines.\n\n" +
            "For questions about this decision, please contact the admin: @rootz491";

          if (imageUrl) {
            await sendPhoto(botToken, {
              chat_id: galleryDoc.telegramId,
              photo: imageUrl,
              caption: rejectionCaption,
              parse_mode: "HTML",
            });
          } else {
            // Fallback if no image URL
            await sendMessage(botToken, {
              chat_id: galleryDoc.telegramId,
              text: rejectionCaption,
              parse_mode: "HTML",
            });
          }

          // After sending rejection message, delete the document and asset from Sanity
          try {
            await deleteGalleryDocument(docId, env);
            console.log(`Moderation: Deleted rejected gallery document ${docId} and its asset`);
          } catch (deleteErr) {
            console.warn(`Moderation: failed to delete rejected document ${docId}:`, deleteErr);
          }
        }
      }
    } catch (err) {
      console.warn("Moderation: failed to notify uploader:", err);
    }
  } catch (err) {
    console.error("Moderation: update failed:", err);
    await answerCallbackQuery(botToken, callbackId, `❌ Error: ${String(err).substring(0, 50)}`, true);
  }
}

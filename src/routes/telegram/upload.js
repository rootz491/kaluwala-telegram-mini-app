import { sendMessage, sendPhoto } from "../../services/telegram/index.js";
import {
  uploadImageAsset,
  createGalleryDocument,
  countPendingPhotos,
} from "../../services/sanityImage.js";
import { isSubscribed } from "../../services/subscribers/index.js";
import { messages } from "../../services/messages.js";

/**
 * Handle /upload command or photo messages
 * When user sends /upload, prompt them to send a photo.
 * When a photo is received (in reply to the prompt or standalone), upload to Sanity.
 * RESTRICTED: User must be subscribed to upload
 */
export async function handleUploadCommand(message, env) {
  const chatId = message.chat?.id;
  if (!chatId) {
    console.warn("Upload: No chat ID found in message");
    return;
  }

  // Check if user is subscribed
  try {
    const subscribed = await isSubscribed(chatId, env);
    if (!subscribed) {
      await sendMessage(env.BOT_TOKEN, {
        chat_id: chatId,
        text: messages.upload.notSubscribed,
      });
      console.warn(`Upload: Blocked non-subscribed user ${chatId}`);
      return;
    }
  } catch (err) {
    console.error("Upload: Failed to check subscription status:", err);
    await sendMessage(env.BOT_TOKEN, {
      chat_id: chatId,
      text: messages.upload.configError,
    }).catch(() => {});
    return;
  }

  // If message contains a photo, process the upload
  if (message.photo && message.photo.length > 0) {
    await processPhotoUpload(message, env);
    return;
  }

  // Otherwise, prompt user to send a photo
  const payload = {
    chat_id: chatId,
    text: messages.upload.prompt,
  };

  try {
    await sendMessage(env.BOT_TOKEN, payload);
  } catch (err) {
    console.error("Upload: sendMessage (prompt) failed:", err);
    throw err;
  }
}

/**
 * Process a photo message: download from Telegram, upload to Sanity, create gallery doc
 */
async function processPhotoUpload(message, env) {
  const chatId = message.chat?.id;
  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    console.error("Upload: BOT_TOKEN not configured");
    await sendMessage(botToken, {
      chat_id: chatId,
      text: "❌ Bot not configured properly. Cannot upload.",
    });
    return;
  }

  // Get the largest photo size available
  const photos = message.photo || [];
  if (photos.length === 0) {
    return;
  }

  const photoInfo = photos[photos.length - 1];
  const fileId = photoInfo.file_id;

  if (!fileId) {
    console.warn("Upload: No file_id in photo");
    await sendMessage(botToken, {
      chat_id: chatId,
      text: messages.upload.fileNotFound,
    });
    return;
  }

  // Send "uploading..." status
  await sendMessage(botToken, {
    chat_id: chatId,
    text: messages.upload.status,
  }).catch((err) =>
    console.warn("Upload: failed to send status message:", err)
  );

  try {
    // Step 1: Get the file path from Telegram
    const fileUrl = `https://api.telegram.org/bot${encodeURIComponent(
      botToken
    )}/getFile`;
    const fileResp = await fetch(fileUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });

    if (!fileResp.ok) {
      throw new Error(`Telegram getFile failed: ${fileResp.status}`);
    }

    const fileData = await fileResp.json();
    if (!fileData.ok || !fileData.result) {
      throw new Error("Telegram getFile: no file path in response");
    }

    const filePath = fileData.result.file_path;
    const fileSize = fileData.result.file_size;

    // Validate file size (e.g., max 2MB for safety)
    const maxSizeBytes = 2 * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      await sendMessage(botToken, {
        chat_id: chatId,
        text: messages.upload.fileTooBig((fileSize / 1024 / 1024).toFixed(1)),
      });
      return;
    }

    // Check pending photo limit (max 5 per user)
    try {
      const pendingCount = await countPendingPhotos(chatId, env);
      if (pendingCount >= 5) {
        await sendMessage(botToken, {
          chat_id: chatId,
          text: messages.upload.pendingLimit(pendingCount),
        });
        return;
      }
    } catch (err) {
      console.warn("Upload: failed to check pending photo count:", err);
      // Don't block upload if the check fails, just warn
    }

    // Step 2: Download the file from Telegram CDN
    const downloadUrl = `https://api.telegram.org/file/bot${encodeURIComponent(
      botToken
    )}/${filePath}`;
    const downloadResp = await fetch(downloadUrl);

    if (!downloadResp.ok) {
      throw new Error(`Download failed: ${downloadResp.status}`);
    }

    const fileBlob = await downloadResp.blob();
    const filename = `telegram-${Date.now()}.jpg`;

    // Step 3: Upload to Sanity
    const { assetId, raw } = await uploadImageAsset(
      fileBlob,
      filename,
      fileBlob.type || "image/jpeg",
      env
    );

    if (!assetId) {
      console.warn("Upload: no asset id returned from Sanity", raw);
      await sendMessage(botToken, {
        chat_id: chatId,
        text: messages.upload.failedUpload,
      });
      return;
    }

    // Step 4: Create gallery document
    const adminIds = (env.ADMIN_IDS || "")
      .split(",")
      .map((id) => String(id).trim())
      .filter((id) => id);

    const isAdmin = adminIds.includes(String(chatId));
    const initialStatus = isAdmin ? "approved" : "pending";

    const galleryRes = await createGalleryDocument(
      {
        assetRef: assetId,
        telegramId: chatId,
        userInfo: {
          first_name: message?.from?.first_name,
          username: message?.from?.username,
        },
        status: initialStatus,
      },
      env
    );

    // Extract gallery document ID from Sanity mutation response
    // Response structure: { results: [{ _id: "...", ... }] } or could be nested differently
    let galleryDocId = galleryRes?.results?.[0]?._id;

    // Try alternative paths if first one didn't work
    if (!galleryDocId) {
      galleryDocId =
        galleryRes?.result?.id || galleryRes?._id || galleryRes?.id;
    }

    console.log(`Upload: Gallery response:`, JSON.stringify(galleryRes));
    console.log(`Upload: Extracted docId: ${galleryDocId}`);

    if (isAdmin) {
      // Admin upload: directly approved, send success message
      await sendMessage(botToken, {
        chat_id: chatId,
        text: messages.upload.successAdmin,
      });
      console.log(
        `Upload: Admin ${chatId} image auto-approved, docId: ${galleryDocId}`
      );
    } else {
      // Regular user upload: send to moderation
      await sendMessage(botToken, {
        chat_id: chatId,
        text: messages.upload.successModeration,
      });

      // Send to moderation chat if configured
      if (env.MODERATION_CHAT_ID && galleryDocId) {
        try {
          // Build image URL from asset ID
          const imageUrl = `https://cdn.sanity.io/images/${env.SANITY_PROJECT_ID}/production/${assetId}?auto=format&w=600`;
          const userHandle = message?.from?.username
            ? `@${message.from.username}`
            : `User ${chatId}`;
          const userName = message?.from?.first_name || "Unknown";

          // Create caption with submission details
          const moderationCaption = messages.moderation_caption.submission(
            userName,
            userHandle,
            galleryDocId
          );

          // Send photo with buttons and caption in a single message
          if (imageUrl) {
            await sendPhoto(botToken, {
              chat_id: env.MODERATION_CHAT_ID,
              photo: imageUrl,
              caption: moderationCaption,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: messages.buttons.approve,
                      callback_data: `gallery_approve_${galleryDocId}`,
                    },
                    {
                      text: messages.buttons.reject,
                      callback_data: `gallery_reject_${galleryDocId}`,
                    },
                  ],
                ],
              },
            });
          } else {
            // Fallback: send text message with buttons if image URL not available
            await sendMessage(botToken, {
              chat_id: env.MODERATION_CHAT_ID,
              text: moderationCaption,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: messages.buttons.approve,
                      callback_data: `gallery_approve_${galleryDocId}`,
                    },
                    {
                      text: messages.buttons.reject,
                      callback_data: `gallery_reject_${galleryDocId}`,
                    },
                  ],
                ],
              },
            });
          }
        } catch (err) {
          console.warn("Upload: failed to send to moderation chat:", err);
        }
      }
    }

    console.log(
      `Upload: success for chat ${chatId}, assetId: ${assetId}, docId: ${galleryDocId}`
    );
  } catch (err) {
    console.error("Upload: processing failed:", err);
    await sendMessage(botToken, {
      chat_id: chatId,
      text: messages.upload.errorGeneric(String(err).substring(0, 100)),
    }).catch((sendErr) =>
      console.warn("Upload: failed to send error message:", sendErr)
    );
  }
}

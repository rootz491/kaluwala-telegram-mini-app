import { sendMessage } from "../../services/telegram/index.js";
import { uploadImageAsset, createGalleryDocument, countPendingPhotos } from "../../services/sanityImage.js";

/**
 * Handle /upload command or photo messages
 * When user sends /upload, prompt them to send a photo.
 * When a photo is received (in reply to the prompt or standalone), upload to Sanity.
 */
export async function handleUploadCommand(message, env) {
  const chatId = message.chat?.id;
  if (!chatId) {
    console.warn("Upload: No chat ID found in message");
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
    text: "📷 Upload your best shot to feature in our community gallery!\n(Each submission goes through a quick moderation process before approval.)",
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
      text: "❌ Could not extract file info from photo.",
    });
    return;
  }

  // Send "uploading..." status
  await sendMessage(botToken, {
    chat_id: chatId,
    text: "⏳ Uploading to gallery...",
  }).catch((err) => console.warn("Upload: failed to send status message:", err));

  try {
    // Step 1: Get the file path from Telegram
    const fileUrl = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/getFile`;
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
        text: `❌ File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Max 2MB.`,
      });
      return;
    }

    // Check pending photo limit (max 5 per user)
    try {
      const pendingCount = await countPendingPhotos(chatId, env);
      if (pendingCount >= 5) {
        await sendMessage(botToken, {
          chat_id: chatId,
          text: `⏸️ You currently have ${pendingCount} photos awaiting review.\nPlease wait until some are approved before uploading new ones.\nYou can have up to 5 pending photos at a time.`,
        });
        return;
      }
    } catch (err) {
      console.warn("Upload: failed to check pending photo count:", err);
      // Don't block upload if the check fails, just warn
    }

    // Step 2: Download the file from Telegram CDN
    const downloadUrl = `https://api.telegram.org/file/bot${encodeURIComponent(botToken)}/${filePath}`;
    const downloadResp = await fetch(downloadUrl);

    if (!downloadResp.ok) {
      throw new Error(`Download failed: ${downloadResp.status}`);
    }

    const fileBlob = await downloadResp.blob();
    const filename = `telegram-${Date.now()}.jpg`;

    // Step 3: Upload to Sanity
    const { assetId, raw } = await uploadImageAsset(fileBlob, filename, fileBlob.type || "image/jpeg", env);

    if (!assetId) {
      console.warn("Upload: no asset id returned from Sanity", raw);
      await sendMessage(botToken, {
        chat_id: chatId,
        text: "❌ Upload to gallery failed. Please try again.",
      });
      return;
    }

    // Step 4: Create gallery document
    const galleryRes = await createGalleryDocument(
      {
        assetRef: assetId,
        telegramId: chatId,
        userInfo: {
          first_name: message?.from?.first_name,
          username: message?.from?.username,
        },
        status: "pending",
      },
      env
    );

    // Success!
    await sendMessage(botToken, {
      chat_id: chatId,
      text: "✅ Image uploaded successfully!\nYour photo has been submitted and is now awaiting review.\nYou’ll be notified once it’s approved and added to the gallery!",
    });

    console.log(`Upload: success for chat ${chatId}, assetId: ${assetId}`);
  } catch (err) {
    console.error("Upload: processing failed:", err);
    await sendMessage(botToken, {
      chat_id: chatId,
      text: `❌ Error uploading image: ${String(err).substring(0, 100)}`,
    }).catch((sendErr) => console.warn("Upload: failed to send error message:", sendErr));
  }
}

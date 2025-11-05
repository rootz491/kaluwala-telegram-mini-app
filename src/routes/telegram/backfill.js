import { sendPhoto, sendMessage } from "../../services/telegram/index.js";
import {
  fetchBlogPostsWithoutTelegramId,
  updateBlogMessageId,
} from "../../services/sanityBlog.js";

/**
 * /backfill command - Backfill discussion channel with existing blog posts
 *
 * Admin-only command that:
 * 1. Fetches all published blog posts without a messageId
 * 2. Posts each one to the discussion channel
 * 3. Captures the message_id from Telegram
 * 4. Updates the blog document in Sanity with the messageId
 *
 * Usage: /backfill
 *
 * Requires:
 * - User to be in ADMIN_IDS
 * - DISCUSSION_CHANNEL_ID configured
 * - SANITY credentials
 * - BOT_TOKEN
 */
export async function handleBackfillCommand(message, env) {
  const chatId = message.chat?.id;
  const userId = message.from?.id;

  // Check admin access
  const adminIds = (env.ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id);

  if (!adminIds.includes(String(userId))) {
    console.log(`Security: /backfill blocked for non-admin user ${userId}`);
    // Silent deny for security
    return;
  }

  const botToken = env.BOT_TOKEN;
  const discussionChannelId = env.DISCUSSION_CHANNEL_ID;

  if (!botToken || !discussionChannelId) {
    try {
      await sendMessage(botToken, {
        chat_id: chatId,
        text: "❌ Missing configuration: BOT_TOKEN or DISCUSSION_CHANNEL_ID",
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error("Backfill: Failed to send error message:", err);
    }
    return;
  }

  let statusMessageId = null;

  try {
    // Send initial status message
    const initialMsg = await sendMessage(botToken, {
      chat_id: chatId,
      text: "⏳ Starting backfill process...\n\nFetching blog posts from Sanity...",
      parse_mode: "HTML",
    });

    if (initialMsg?.result?.message_id) {
      statusMessageId = initialMsg.result.message_id;
    }

    // Fetch blog posts without messageId
    const blogs = await fetchBlogPostsWithoutTelegramId(env);

    if (!blogs || blogs.length === 0) {
      const msg =
        statusMessageId && botToken
          ? {
              method: "editMessageText",
              chat_id: chatId,
              message_id: statusMessageId,
              text: "✅ No blog posts found that need backfilling.\n\nAll existing posts already have messageId set.",
              parse_mode: "HTML",
            }
          : {
              chat_id: chatId,
              text: "✅ No blog posts found that need backfilling.\n\nAll existing posts already have messageId set.",
              parse_mode: "HTML",
            };

      await sendMessage(botToken, msg);
      return;
    }

    console.log(`Backfill: Found ${blogs.length} blog posts without messageId`);

    let successCount = 0;
    let failureCount = 0;

    // Process each blog post
    for (let i = 0; i < blogs.length; i++) {
      const blog = blogs[i];
      const progress = `${i + 1}/${blogs.length}`;

      try {
        const blogUrl = env.BLOG_URL || "https://kaluwala.in";
        const postUrl = blog.slug?.current
          ? `${blogUrl}/blog/${blog.slug.current}`
          : blogUrl;
        const authorName = (blog.author && blog.author.name) || "Karan Sharma";

        const messageText = `📝 <b>${blog.title}</b>
✍️ By ${authorName}
Check it out now!`;

        const hasImage = blog.mainImage?.asset?.url;

        // Send to discussion channel (use sendPhoto if image exists, else sendMessage)
        let discussionResponse;

        if (hasImage) {
          const discussionPayload = {
            chat_id: discussionChannelId,
            photo: blog.mainImage.asset.url,
            caption: messageText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🌐 open in web", url: postUrl }],
                [{ text: "📖 open in telegram", web_app: { url: postUrl } }],
              ],
            },
          };
          discussionResponse = await sendPhoto(botToken, discussionPayload);
        } else {
          // No image, use sendMessage with simple URL button (web_app not supported with text messages in some cases)
          const discussionPayload = {
            chat_id: discussionChannelId,
            text: messageText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "🌐 Read on blog", url: postUrl }]],
            },
          };
          discussionResponse = await sendMessage(botToken, discussionPayload);
        }

        if (discussionResponse?.result?.message_id && blog._id) {
          const messageId = discussionResponse.result.message_id;

          // Update blog document with message ID
          await updateBlogMessageId(blog._id, messageId, env);
          successCount++;

          console.log(
            `Backfill: Updated blog ${blog._id} with messageId ${messageId}`
          );
        } else {
          failureCount++;
          console.warn(
            `Backfill: Failed to get messageId for blog ${blog._id}`
          );
        }
      } catch (err) {
        failureCount++;
        console.error(`Backfill: Error processing blog ${blog._id}:`, err);
      }

      // Update status message every 5 posts
      if ((i + 1) % 5 === 0 || i + 1 === blogs.length) {
        const updatePayload = {
          chat_id: chatId,
          text: `⏳ Processing: <b>${progress}</b>\n\n✅ Success: ${successCount}\n❌ Failed: ${failureCount}`,
          parse_mode: "HTML",
        };

        if (statusMessageId) {
          updatePayload.message_id = statusMessageId;
        }

        try {
          await sendMessage(botToken, updatePayload);
        } catch (err) {
          console.error("Backfill: Failed to update status:", err);
        }
      }

      // Add small delay between posts to avoid rate limiting
      if (i < blogs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Final summary
    const summaryPayload = {
      chat_id: chatId,
      text: `✅ Backfill complete!\n\n📊 Results:\n✅ Success: ${successCount}\n❌ Failed: ${failureCount}\n📝 Total: ${blogs.length}`,
      parse_mode: "HTML",
    };

    if (statusMessageId) {
      summaryPayload.message_id = statusMessageId;
    }

    try {
      await sendMessage(botToken, summaryPayload);
    } catch (err) {
      console.error("Backfill: Failed to send final summary:", err);
      // Send as new message if edit fails
      try {
        await sendMessage(botToken, {
          chat_id: chatId,
          text: `✅ Backfill complete!\n\n📊 Results:\n✅ Success: ${successCount}\n❌ Failed: ${failureCount}\n📝 Total: ${blogs.length}`,
          parse_mode: "HTML",
        });
      } catch (err2) {
        console.error("Backfill: Failed to send fallback message:", err2);
      }
    }
  } catch (err) {
    console.error("Backfill: Fatal error:", err);

    try {
      const errorPayload = {
        chat_id: chatId,
        text: `❌ Backfill failed:\n\n<code>${err.message}</code>`,
        parse_mode: "HTML",
      };

      if (statusMessageId) {
        errorPayload.message_id = statusMessageId;
      }

      await sendMessage(botToken, errorPayload);
    } catch (err2) {
      console.error("Backfill: Failed to send error message:", err2);
    }
  }
}

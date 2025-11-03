export const messages = {
  start: {
    welcome: "👋 Welcome to Kaluwala!\n\nI'm here to help you manage your blog, subscribe to updates, and contribute to our community gallery.",
  },

  subscribe: {
    success: "You're subscribed to blog updates! We'll notify you when a new post is published.",
    already: "You're already subscribed! 😊 Sit back and relax, we'll notify you when new content drops.",
    error: "Sorry, we couldn't verify your Telegram account. Please try again later.",
    ephemeral: "You're subscribed (ephemeral). To persist subscriptions across deploys, configure a Cloudflare KV namespace or D1 database binding.",
  },

  unsubscribe: {
    farewell: "We've removed you from our subscriber list. 👋\n\nFeel free to /subscribe anytime if you change your mind. We'd love to have you back!",
    notSubscribed: "You're not currently subscribed to our blog updates. 😊",
    error: "❌ Sorry, something went wrong while unsubscribing. Please try again later.",
  },

  upload: {
    notSubscribed: "🔒 You need to be subscribed to upload images to the gallery.\n\nPlease use /subscribe to get started!",
    prompt: "📷 Upload your best shot to feature in our community gallery!\n(Each submission goes through a quick moderation process before approval.)",
    fileTooBig: (size) => `❌ File too large (${size}MB). Max 2MB.`,
    pendingLimit: (count) => `⏸️ You currently have ${count} photos awaiting review.\nPlease wait until some are approved before uploading new ones.\nYou can have up to 5 pending photos at a time.`,
    status: "⏳ Uploading to gallery...",
    success: "✅ Image uploaded successfully!\nYour photo has been submitted and is now awaiting review.\nYou'll be notified once it's approved and added to the gallery!",
    failedUpload: "❌ Upload to gallery failed. Please try again.",
    fileNotFound: "❌ Could not extract file info from photo.",
    errorGeneric: (error) => `❌ Error uploading image: ${error}`,
    configError: "❌ Bot not configured properly. Cannot upload.",
  },

  moderation: {
    unauthorized: "❌ Unauthorized",
    imageNotFound: "❌ Image not found",
    alreadyModerated: (status) => `⚠️ Already ${status}. Cannot change decision.`,
    approved: "✅ Image approved!",
    rejected: "❌ Image rejected!",
    deletedMessage: "Deleted moderation message from chat",
    failedDelete: "Failed to delete message, attempting to remove buttons",
    failedEdit: "Failed to edit message",
    failedNotify: "Failed to notify uploader",
    failedSendModeration: "Failed to send to moderation chat",
  },

  moderation_notification: {
    approvalCaption: "🎉 <b>Photo Approved!</b>\n\nGreat news! Your photo was approved and is now live in the gallery!",
    rejectionCaption: "❌ <b>Photo Not Approved</b>\n\nUnfortunately, your photo submission did not meet our guidelines.\n\nFor questions about this decision, please contact the admin: @rootz491",
  },

  pending: {
    noImages: "✅ No pending images at the moment. Gallery is all caught up!",
    summary: (total) => `📋 <b>Pending Gallery Submissions</b>\n\nTotal: <b>${total}</b> pending image(s) awaiting review`,
    errorFetch: (error) => `❌ Error fetching pending images: ${error}`,
  },

  chatid: {
    title: "<b>Chat Information</b>",
    format: (chatId, title, type) => `<b>Chat ID:</b>\n<code>${chatId}</code>\n\n<b>Chat Title:</b> ${title || "N/A"}\n<b>Chat Type:</b> ${type}`,
  },

  moderation_caption: {
    submission: (name, handle, docId) => `📸 <b>New Submission for Review</b>\n\n👤 From: ${name} (${handle})\n🆔 <code>${docId}</code>`,
  },

  buttons: {
    approve: "✅ Approve",
    reject: "❌ Reject",
    openBrowser: "🌐 Open in Browser",
  },
};

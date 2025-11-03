/**
 * Middleware to protect commands that should only run in specific chats
 * @param {Function} handler - The command handler to protect
 * @param {string|number} allowedChatId - The chat ID where this command is allowed
 * @returns {Function} Protected handler
 */
export function requireChatId(handler, allowedChatId) {
  return async (message, env) => {
    const chatId = message.chat?.id;

    if (!allowedChatId) {
      console.warn("requireChatId: allowedChatId not configured");
      return;
    }

    if (chatId !== Number(allowedChatId)) {
      console.warn(
        `Security: Unauthorized access attempt to protected command from chat ${chatId}. Expected: ${allowedChatId}`
      );
      // Silently ignore - don't respond to unauthorized access
      return;
    }

    // Chat ID matches, proceed with handler
    return handler(message, env);
  };
}

/**
 * Middleware to protect commands based on user ID
 * @param {Function} handler - The command handler to protect
 * @param {string|number} allowedUserId - The user ID allowed to run this command
 * @returns {Function} Protected handler
 */
export function requireUserId(handler, allowedUserId) {
  return async (message, env) => {
    const userId = message.from?.id;

    if (!allowedUserId) {
      console.warn("requireUserId: allowedUserId not configured");
      return;
    }

    if (userId !== Number(allowedUserId)) {
      console.warn(`Security: Unauthorized access attempt by user ${userId}. Expected: ${allowedUserId}`);
      return;
    }

    return handler(message, env);
  };
}

/**
 * Middleware to protect commands based on multiple criteria
 * @param {Function} handler - The command handler to protect
 * @param {Object} options - { allowedChatIds: [id1, id2], allowedUserIds: [id1, id2] }
 * @returns {Function} Protected handler
 */
export function requireAuth(handler, options = {}) {
  const { allowedChatIds = [], allowedUserIds = [] } = options;

  return async (message, env) => {
    const chatId = message.chat?.id;
    const userId = message.from?.id;

    const chatAllowed = allowedChatIds.length === 0 || allowedChatIds.includes(chatId);
    const userAllowed = allowedUserIds.length === 0 || allowedUserIds.includes(userId);

    if (!chatAllowed || !userAllowed) {
      console.warn(
        `Security: Unauthorized access - ChatId: ${chatId} (allowed: ${allowedChatIds.join(",")}), UserId: ${userId} (allowed: ${allowedUserIds.join(",")})`
      );
      return;
    }

    return handler(message, env);
  };
}

import { validateChatId } from "../telegram/index.js";

/**
 * Subscribers service
 * - Provides an abstraction for persisting subscriber chat ids.
 */
export async function addSubscriber({ chatId, first_name, username }, env) {
  const key = String(chatId);

  // Check if already subscribed
  const alreadySubscribed = await isSubscribed(key, env);
  if (alreadySubscribed) {
    return { persisted: false, error: "already_subscribed" };
  }

  // Validate chat ID with Telegram API before persisting
  const isValid = await validateChatId(env.BOT_TOKEN, key);
  if (!isValid) {
    console.warn(`Subscribers: Invalid chat ID ${key}, refusing to add`);
    return { persisted: false, error: "invalid_user" };
  }

  const d1 = env.DB;
  if (d1 && typeof d1.prepare === "function") {
    try {
      // Use INSERT OR IGNORE to avoid duplicate errors
      const stmt = d1.prepare(
        `INSERT OR IGNORE INTO subscribers (telegram_id, first_name, username, subscribed_at) VALUES (?, ?, ?, datetime('now'))`
      );
      await stmt.bind(key, first_name || null, username || null).run();
      return { persisted: true, backend: "d1" };
    } catch (err) {
      console.warn("Subscribers: D1 insert failed:", err);
    }
  }

  // Fallback: not persisted
  return { persisted: false };
}

/**
 * listSubscribers - fetch all subscribers
 */
export async function listSubscribers(env) {
  const d1 = env.DB;
  if (d1 && typeof d1.prepare === "function") {
    const res = await d1
      .prepare(
        "SELECT telegram_id, first_name, username, subscribed_at FROM subscribers"
      )
      .all();
    return res.results || [];
  }

  return [];
}

/**
 * isSubscribed - check whether the given chatId is present in subscribers
 * Returns true if present, false otherwise. Works with D1 only (DB binding `env.DB`).
 */
export async function isSubscribed(chatId, env) {
  const key = String(chatId);
  const d1 = env.DB;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const res = await d1
        .prepare("SELECT 1 FROM subscribers WHERE telegram_id = ? LIMIT 1")
        .bind(key)
        .first();
      return !!(res && Object.keys(res).length > 0);
    } catch (err) {
      console.warn("Subscribers: D1 isSubscribed check failed:", err);
      return false;
    }
  }

  // No persistence mechanism configured
  return false;
}

/**
 * removeSubscriber - delete subscriber from the database
 * Returns { persisted: boolean, error?: string }
 */
export async function removeSubscriber(chatId, env) {
  const key = String(chatId);

  // Check if currently subscribed
  const subscribed = await isSubscribed(key, env);
  if (!subscribed) {
    return { persisted: false, error: "not_subscribed" };
  }

  const d1 = env.DB;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const stmt = d1.prepare("DELETE FROM subscribers WHERE telegram_id = ?");
      await stmt.bind(key).run();
      return { persisted: true };
    } catch (err) {
      console.warn("Subscribers: D1 delete failed:", err);
      return { persisted: false, error: "database_error" };
    }
  }

  // No persistence mechanism configured
  return { persisted: false };
}

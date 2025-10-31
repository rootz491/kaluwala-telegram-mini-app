/**
 * Subscribers service
 * - Provides an abstraction for persisting subscriber chat ids.
 */

export async function addSubscriber({ chatId, first_name, username }, env) {
  const key = String(chatId);

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

export async function listSubscribers(env) {
  const d1 = env.DB;
  if (d1 && typeof d1.prepare === "function") {
    const res = await d1.prepare("SELECT telegram_id, first_name, username, subscribed_at FROM subscribers").all();
    return res.results || [];
  }

  return [];
}

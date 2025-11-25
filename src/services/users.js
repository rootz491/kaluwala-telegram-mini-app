import { findOne, upsertBy, Q } from "./appwrite.js";

export async function getByTelegramId(env, telegramId) {
  return findOne(env, env.APPWRITE_COLL_USERS, [
    Q.equal("telegramId", telegramId),
  ]);
}

export async function upsertUser(env, { telegramId, username, name }) {
  return upsertBy(
    env,
    env.APPWRITE_COLL_USERS,
    [Q.equal("telegramId", telegramId)],
    (existing) => ({
      telegramId,
      username: username || existing?.username || null,
      name: name || existing?.name || null,
      role: existing?.role || "user",
      createdAt: existing?.createdAt || new Date().toISOString(),
    })
  );
}

export async function isDistributorOrAdmin(env, telegramId) {
  const user = await getByTelegramId(env, telegramId);
  return user && (user.role === "distributor" || user.role === "admin");
}

export async function requireDistributorOrAdmin(env, telegramId) {
  const allowed = await isDistributorOrAdmin(env, telegramId);
  if (!allowed) {
    throw new Error("Permission denied. Distributors and admins only.");
  }
  return true;
}

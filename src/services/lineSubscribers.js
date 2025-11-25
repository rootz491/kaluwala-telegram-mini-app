import { findOne, upsertBy, listDocs, Q } from "./appwrite.js";

export async function getByTelegramId(env, telegramId) {
  return findOne(env, env.APPWRITE_COLL_LINE_SUBSCRIBERS, [
    Q.equal("telegramId", telegramId),
  ]);
}

export async function addLineSubscription(env, telegramId, lineId) {
  return upsertBy(
    env,
    env.APPWRITE_COLL_LINE_SUBSCRIBERS,
    [Q.equal("telegramId", telegramId)],
    (existing) => {
      const currentLines = existing?.lineIds || [];
      const lineIds = currentLines.includes(lineId)
        ? currentLines
        : [...currentLines, lineId];
      return {
        telegramId,
        lineIds,
      };
    }
  );
}

export async function removeLineSubscription(env, telegramId, lineId) {
  return upsertBy(
    env,
    env.APPWRITE_COLL_LINE_SUBSCRIBERS,
    [Q.equal("telegramId", telegramId)],
    (existing) => {
      const currentLines = existing?.lineIds || [];
      const lineIds = currentLines.filter((id) => id !== lineId);
      return {
        telegramId,
        lineIds,
      };
    }
  );
}

export async function getSubscribersForLine(env, lineId) {
  const docs = await listDocs(env, env.APPWRITE_COLL_LINE_SUBSCRIBERS, [
    Q.contains("lineIds", lineId),
  ]);
  return docs.map((d) => d.telegramId);
}

import { findOne, listDocs, Q } from "./appwrite.js";

export async function getLineByName(env, name) {
  return findOne(env, env.APPWRITE_COLL_LINES, [Q.equal("name", name)]);
}

export async function getLineById(env, lineId) {
  return findOne(env, env.APPWRITE_COLL_LINES, [Q.equal("$id", lineId)]);
}

export async function listLines(env) {
  return listDocs(env, env.APPWRITE_COLL_LINES, [Q.orderAsc("name")]);
}

export async function resolveLineByNameOrId(env, nameOrId) {
  let line = await getLineByName(env, nameOrId);
  if (!line) {
    line = await getLineById(env, nameOrId);
  }
  return line;
}

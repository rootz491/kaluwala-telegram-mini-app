export const awHeaders = (env) => ({
  "Content-Type": "application/json",
  "X-Appwrite-Project": env.APPWRITE_PROJECT_ID,
  "X-Appwrite-Key": env.APPWRITE_API_KEY,
});

const baseUrl = (env) =>
  `${env.APPWRITE_ENDPOINT}/databases/${env.APPWRITE_DB_ID}/collections`;

export async function createDoc(env, collectionId, data, permissions = []) {
  const url = `${baseUrl(env)}/${collectionId}/documents`;
  const res = await fetch(url, {
    method: "POST",
    headers: awHeaders(env),
    body: JSON.stringify({
      documentId: "unique()",
      data,
      permissions,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`Appwrite createDoc failed ${res.status}: ${text}`);
  }

  return res.json();
}

export async function updateDoc(env, collectionId, documentId, data) {
  const url = `${baseUrl(env)}/${collectionId}/documents/${documentId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: awHeaders(env),
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`Appwrite updateDoc failed ${res.status}: ${text}`);
  }

  return res.json();
}

export async function deleteDoc(env, collectionId, documentId) {
  const url = `${baseUrl(env)}/${collectionId}/documents/${documentId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: awHeaders(env),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`Appwrite deleteDoc failed ${res.status}: ${text}`);
  }

  return true;
}

export async function listDocs(env, collectionId, queries = []) {
  const url = new URL(`${baseUrl(env)}/${collectionId}/documents`);
  queries.forEach((q) => url.searchParams.append("queries[]", q));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: awHeaders(env),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`Appwrite listDocs failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.documents || [];
}

export async function findOne(env, collectionId, queries = []) {
  const docs = await listDocs(env, collectionId, [...queries, Q.limit(1)]);
  return docs.length > 0 ? docs[0] : null;
}

export async function getDoc(env, collectionId, documentId) {
  const url = `${baseUrl(env)}/${collectionId}/documents/${documentId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: awHeaders(env),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`Appwrite getDoc failed ${res.status}: ${text}`);
  }

  return res.json();
}

export async function upsertBy(env, collectionId, whereQueries, makeData) {
  const existing = await findOne(env, collectionId, whereQueries);

  if (existing) {
    const data = makeData(existing);
    return updateDoc(env, collectionId, existing.$id, data);
  } else {
    const data = makeData(null);
    return createDoc(env, collectionId, data);
  }
}

export const Q = {
  equal: (attr, value) =>
    `equal("${attr}", ${JSON.stringify(Array.isArray(value) ? value : [value])})`,

  notEqual: (attr, value) =>
    `notEqual("${attr}", ${JSON.stringify(Array.isArray(value) ? value : [value])})`,

  greaterThan: (attr, value) => `greaterThan("${attr}", ${JSON.stringify(value)})`,

  greaterEqual: (attr, value) => `greaterThanEqual("${attr}", ${JSON.stringify(value)})`,

  lessThan: (attr, value) => `lessThan("${attr}", ${JSON.stringify(value)})`,

  lessEqual: (attr, value) => `lessThanEqual("${attr}", ${JSON.stringify(value)})`,

  contains: (attr, value) =>
    `contains("${attr}", ${JSON.stringify(Array.isArray(value) ? value : [value])})`,

  search: (attr, value) => `search("${attr}", ${JSON.stringify(value)})`,

  orderAsc: (attr) => `orderAsc("${attr}")`,

  orderDesc: (attr) => `orderDesc("${attr}")`,

  limit: (n) => `limit(${n})`,

  offset: (n) => `offset(${n})`,

  cursorAfter: (id) => `cursorAfter("${id}")`,

  cursorBefore: (id) => `cursorBefore("${id}")`,
};

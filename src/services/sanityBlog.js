export async function updateBlogMessageId(docId, messageId, env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error(
      "Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env"
    );
  }

  const url = `https://${projectId}.api.sanity.io/v2022-12-07/data/mutate/${dataset}`;

  const body = {
    mutations: [
      {
        patch: {
          id: docId,
          set: {
            telegramId: String(messageId),
          },
        },
      },
    ],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`Sanity update blog failed ${resp.status}: ${text}`);
  }

  return resp.json();
}

/**
 * Fetch all published blog posts from Sanity that don't have a telegramId yet
 * Used for backfilling discussion channel messages for existing posts
 */
export async function fetchBlogPostsWithoutTelegramId(env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error(
      "Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env"
    );
  }

  const groqQuery = `
    *[_type == "post" && defined(slug) && !defined(telegramId) && defined(publishedAt)] | order(publishedAt desc) {
      _id,
      title,
      slug,
      author-> { name },
      mainImage { asset { url } },
      publishedAt
    }
  `;

  const url = `https://${projectId}.api.sanity.io/v2022-12-07/data/query/${dataset}`;

  const resp = await fetch(`${url}?query=${encodeURIComponent(groqQuery)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`Sanity query failed ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.result || [];
}

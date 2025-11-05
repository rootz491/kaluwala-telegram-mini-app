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
            messageId: String(messageId),
            messageSentAt: new Date().toISOString(),
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

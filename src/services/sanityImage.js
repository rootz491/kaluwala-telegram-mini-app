/**
 * Sanity image uploader service
 *
 * Exports:
 * - uploadImageAsset(fileBlob, filename, contentType, env) => { assetId, raw }
 * - createGalleryDocument({ assetRef, telegramId, status }, env)
 *
 * Environment variables required:
 * - SANITY_PROJECT_ID
 * - SANITY_DATASET (optional, defaults to 'production')
 * - SANITY_API_TOKEN
 */

export async function uploadImageAsset(fileBlob, filename, contentType, env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error("Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env");
  }

  const url = `https://${projectId}.api.sanity.io/v2022-12-07/assets/images/${dataset}`;

  // `fileBlob` is expected to be a File/Blob (as returned by Request.formData())
  const form = new FormData();
  form.append("file", fileBlob, filename);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Note: Do not set Content-Type here; the browser/worker will set the multipart boundary
    },
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no body>");
    throw new Error(`Sanity asset upload failed ${resp.status}: ${text}`);
  }

  const json = await resp.json().catch(() => null);

  // Sanity returns the created document in `document` (and sometimes top-level fields).
  const assetId = (json && (json.document?._id || json._id)) || null;
  return { assetId, raw: json };
}

export async function createGalleryDocument({ assetRef, telegramId, status = "pending" }, env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error("Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env");
  }

  const url = `https://${projectId}.api.sanity.io/v2022-12-07/data/mutate/${dataset}`;

  const body = {
    mutations: [
      {
        create: {
          _type: "gallery",
          image: {
            _type: "image",
            asset: {
              _ref: assetRef,
              _type: "reference",
            },
          },
          telegramId: telegramId ? String(telegramId) : null,
          status,
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
    throw new Error(`Sanity create gallery failed ${resp.status}: ${text}`);
  }

  return resp.json();
}

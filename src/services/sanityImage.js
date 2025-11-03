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

  // Convert Blob to ArrayBuffer for reliable binary handling
  const arrayBuffer = await fileBlob.arrayBuffer();

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType || "image/jpeg",
      "Filename": filename,
    },
    body: arrayBuffer,
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

export async function createGalleryDocument({ assetRef, telegramId, status = "pending", userInfo = {} }, env) {
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
          firstName: userInfo?.first_name || null,
          username: userInfo?.username || null,
          uploadedAt: new Date().toISOString(),
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

/**
 * Count pending gallery documents for a user
 * Returns the number of pending photos from this telegramId
 */
export async function countPendingPhotos(telegramId, env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error("Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env");
  }

  const chatIdStr = String(telegramId);
  // GROQ query to count pending gallery docs for this user
  const query = `count(*[_type == "gallery" && status == "pending" && telegramId == "${chatIdStr}"])`;
  const url = `https://${projectId}.api.sanity.io/v2022-12-07/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    console.warn(`Sanity: countPendingPhotos query failed ${resp.status}`);
    throw new Error(`Sanity query failed: ${resp.status}`);
  }

  const json = await resp.json();
  return json.result || 0;
}

/**
 * Get gallery document by ID
 * Used to fetch details like asset URL for moderation
 */
export async function getGalleryDocument(docId, env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error("Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env");
  }

  const query = `*[_id == "${docId}"][0]`;
  const url = `https://${projectId}.api.sanity.io/v2022-12-07/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    console.warn(`Sanity: getGalleryDocument query failed ${resp.status}`);
    throw new Error(`Sanity query failed: ${resp.status}`);
  }

  const json = await resp.json();
  return json.result || null;
}

/**
 * Update gallery document status (approve/reject)
 * Also optionally add moderator notes
 */
export async function updateGalleryStatus(docId, newStatus, notes = null, env) {
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
        patch: {
          id: docId,
          set: {
            status: newStatus,
            moderatedAt: new Date().toISOString(),
            ...(notes && { moderatorNotes: notes }),
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
    throw new Error(`Sanity update gallery failed ${resp.status}: ${text}`);
  }

  return resp.json();
}

/**
 * Get all pending gallery documents with metadata
 * Returns array of pending image documents
 */
export async function getPendingGalleryImages(env) {
  const projectId = env.SANITY_PROJECT_ID;
  const dataset = "production";
  const token = env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error("Sanity: SANITY_PROJECT_ID or SANITY_API_TOKEN not configured in env");
  }

  // GROQ query to fetch all pending gallery docs with relevant fields
  const query = `*[_type == "gallery" && status == "pending"] | order(_createdAt desc) {
    _id,
    _createdAt,
    firstName,
    username,
    telegramId,
    status,
    image {
      asset -> {
        _id,
        url
      }
    }
  }`;
  
  const url = `https://${projectId}.api.sanity.io/v2022-12-07/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    console.warn(`Sanity: getPendingGalleryImages query failed ${resp.status}`);
    throw new Error(`Sanity query failed: ${resp.status}`);
  }

  const json = await resp.json();
  return json.result || [];
}

/**
 * Build Sanity image URL for a gallery document
 * Returns URL string that can be used to display the image
 */
export function buildImageUrl(galleryDoc, projectId) {
  if (!galleryDoc?.image?.asset?._ref) {
    return null;
  }

  const assetRef = galleryDoc.image.asset._ref;
  // Parse asset ref: image-<id>-<dimensions>-<format>
  // Build URL: https://cdn.sanity.io/images/<project>/<dataset>/<id>-<dimensions>.<format>?auto=format
  const imageUrl = `https://cdn.sanity.io/images/${projectId}/production/${assetRef}?auto=format&w=600`;
  return imageUrl;
}

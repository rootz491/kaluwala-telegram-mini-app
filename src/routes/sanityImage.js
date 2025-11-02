import { uploadImageAsset, createGalleryDocument } from "../services/sanityImage.js";

/**
 * Endpoint to accept an image upload and create a gallery document in Sanity.
 * Expects multipart/form-data with field `file` and optional `telegramId`.
 * Protect with env.SANITY_UPLOAD_SECRET (compares against x-api-key header) if set.
 */
export async function handleSanityImageUpload(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const expectedSecret = env.SANITY_UPLOAD_SECRET;
  if (expectedSecret) {
    const incoming = request.headers.get("x-api-key") || "";
    if (!incoming || incoming !== expectedSecret) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    console.error("SanityImage: failed to parse form data", err);
    return new Response(JSON.stringify({ error: "invalid_form" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const file = form.get("file");
  const telegramId = form.get("telegramId") || form.get("telegram_id") || null;

  if (!file) {
    return new Response(JSON.stringify({ error: "missing_file" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const filename = file.name || `upload-${Date.now()}`;

  try {
    const { assetId, raw } = await uploadImageAsset(file, filename, file.type || "application/octet-stream", env);

    if (!assetId) {
      console.warn("SanityImage: no asset id returned from upload", raw);
      return new Response(JSON.stringify({ error: "no_asset_id", raw }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const createRes = await createGalleryDocument({ assetRef: assetId, telegramId, userInfo: {}, status: "pending" }, env);

    return new Response(JSON.stringify({ ok: true, assetId, createRes }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("SanityImage: upload/create failed", err);
    return new Response(JSON.stringify({ error: "upload_failed", message: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

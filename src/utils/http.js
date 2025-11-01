export async function parseJson(request) {
  try {
    return await request.json();
  } catch (err) {
    throw new Error("Invalid JSON body: " + (err && err.message));
  }
}

export async function verifySanitySignature(request, secret) {
  const signature = request.headers.get("X-Sanity-Signature");
  if (!signature) return false;

  const body = await request.clone().text();
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(body)
  );
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
}

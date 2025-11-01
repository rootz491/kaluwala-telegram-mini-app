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

  return signature === secret;
}

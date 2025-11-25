import { upsertBy, Q } from "../services/appwrite.js";
import { SignJWT, jwtVerify } from "jose";

const JWT_EXPIRY = "24h";

export async function handleAuthWebhook(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { initData } = body;
  if (!initData) {
    return Response.json({ success: false, error: "Missing initData" }, { status: 400 });
  }

  // Parse and validate initData
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return Response.json({ success: false, error: "Missing hash" }, { status: 400 });
  }

  // Build data-check-string (sorted key=value pairs, excluding hash)
  const entries = [];
  for (const [key, value] of params.entries()) {
    if (key !== "hash") {
      entries.push([key, value]);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  // Validate HMAC-SHA256
  const isValid = await validateTelegramHash(dataCheckString, hash, env.BOT_TOKEN);
  if (!isValid) {
    return Response.json({ success: false, error: "Invalid hash" }, { status: 401 });
  }

  // Parse user data
  const userDataStr = params.get("user");
  if (!userDataStr) {
    return Response.json({ success: false, error: "Missing user data" }, { status: 400 });
  }

  let userData;
  try {
    userData = JSON.parse(userDataStr);
  } catch {
    return Response.json({ success: false, error: "Invalid user data" }, { status: 400 });
  }

  const telegramId = userData.id;
  const firstName = userData.first_name || "";
  const lastName = userData.last_name || "";
  const username = userData.username || null;
  const name = `${firstName} ${lastName}`.trim() || "User";

  try {
    // Upsert user in Appwrite
    const user = await upsertBy(
      env,
      env.APPWRITE_COLL_USERS,
      [Q.equal("telegramId", telegramId)],
      (existing) => ({
        telegramId,
        username: username || existing?.username || null,
        name: name || existing?.name || null,
        role: existing?.role || "villager",
      })
    );

    // Generate JWT for Mini-App client using jose
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new SignJWT({
      sub: String(telegramId),
      userId: user.$id,
      telegramId: user.telegramId,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(secret);

    return Response.json({
      success: true,
      token,
      expiresIn: 86400, // 24 hours in seconds
      user: {
        id: user.$id,
        telegramId: user.telegramId,
        name: user.name,
        role: user.role,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("Auth error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Verify JWT for protected endpoints
export async function verifyJWT(token, secret) {
  const secretKey = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, secretKey);
  return payload;
}

async function validateTelegramHash(dataCheckString, hash, botToken) {
  const encoder = new TextEncoder();

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secretHash = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(botToken));

  // calculated_hash = HMAC_SHA256(secret_key, data_check_string)
  const dataKey = await crypto.subtle.importKey(
    "raw",
    secretHash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const calculatedHash = await crypto.subtle.sign("HMAC", dataKey, encoder.encode(dataCheckString));

  // Compare hex strings
  const calculatedHex = Array.from(new Uint8Array(calculatedHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return calculatedHex === hash;
}

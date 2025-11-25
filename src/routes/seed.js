import { createDoc, listDocs, Q } from "../services/appwrite.js";

export async function handleSeedWebhook(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = request.headers.get("X-Notify-Secret");
  if (!secret || secret !== env.NOTIFY_SHARED_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const results = { lines: { created: 0, skipped: 0 }, users: { created: 0, skipped: 0 } };

    // Seed lines (Line 1 through Line 10)
    const existingLines = await listDocs(env, env.APPWRITE_COLL_LINES, []);
    const existingLineNames = new Set(existingLines.map((l) => l.name));

    for (let i = 1; i <= 10; i++) {
      const name = `Line ${i}`;
      if (existingLineNames.has(name)) {
        results.lines.skipped++;
        continue;
      }
      await createDoc(env, env.APPWRITE_COLL_LINES, {
        name,
        label: name,
        description: null,
        active: true,
      });
      results.lines.created++;
    }

    // Seed admin user from ADMIN_IDS
    const adminIds = (env.ADMIN_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    const existingUsers = await listDocs(env, env.APPWRITE_COLL_USERS, []);
    const existingUserIds = new Set(existingUsers.map((u) => String(u.telegramId)));

    for (const adminId of adminIds) {
      if (existingUserIds.has(adminId)) {
        results.users.skipped++;
        continue;
      }
      await createDoc(env, env.APPWRITE_COLL_USERS, {
        telegramId: parseInt(adminId, 10),
        username: null,
        name: "Admin",
        role: "admin",
      });
      results.users.created++;
    }

    return Response.json({ success: true, results });
  } catch (err) {
    console.error("Seed error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { parseJson, verifySanitySignature } from "../utils/http.js";
import { sendMessage } from "../services/telegram/index.js";
import { listSubscribers } from "../services/subscribers/index.js";

export async function handleSanityWebhook(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // const expected = env.SANITY_WEBHOOK_SECRET;
  // const isValid = await verifySanitySignature(request, expected);
  // if (!isValid) {
  //   console.warn("Sanity: invalid or missing webhook secret");
  //   return new Response("Forbidden", { status: 403 });
  // }

  let body;

  try {
    body = await parseJson(request);
  } catch (err) {
    console.error("Sanity: failed to parse JSON body:", err);
    return new Response("Bad Request", { status: 400 });
  }

  // Extract blog post data from the webhook payload
  const title = body.title || "New Post";
  const authorName = (body.author && body.author.name) || "Karan Sharma";
  const slug = (body.slug && body.slug.current) || null;
  const mainImageUrl = body?.mainImage?.asset?.url || null;

  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    console.error(
      "Sanity: BOT_TOKEN not configured in environment — cannot forward webhook"
    );
    return new Response("ok", { status: 200 });
  }

  // Fetch subscribers (supports KV and D1)
  let subscribers = [];
  try {
    subscribers = await listSubscribers(env);
  } catch (err) {
    console.error("Sanity: failed to list subscribers:", err);
    // still return OK to webhook sender
    return new Response("ok", { status: 200 });
  }

  // Build rich message text with emoji and author info
  const blogUrl = env.BLOG_URL || "https://kaluwala.in";
  const postUrl = slug ? `${blogUrl}/blog/${slug}` : blogUrl;

  const messageText = `📝 <b>New Post Published!</b>
✍️ By ${authorName}
Check it out now!`;

  // Build per-subscriber message payload (includes Web App button pointing to specific post)
  const payloadTemplate = {
    photo: mainImageUrl,
    caption: title,
    text: messageText,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "📖 Read Post", web_app: { url: postUrl } }]],
    },
  };

  // Batch sends: send N at a time using Promise.all, then wait between batches
  const batchSize = Number(env.BATCH_SIZE) || 5; // default 5 per batch
  const batchDelayMs = Number(env.BATCH_DELAY_MS) || 1000; // default 1s between batches

  // Helper to resolve chat id from different subscriber shapes
  const resolveChatId = (sub) => {
    // D1 row: { telegram_id }
    if (sub && sub.telegram_id) return sub.telegram_id;
    // KV list() returns objects like { name: '123' }
    if (sub && typeof sub.name === "string") return sub.name;
    // maybe a raw string
    if (typeof sub === "string") return sub;
    return null;
  };

  // Build a flat list of chat ids
  const chatIds = [];
  for (const sub of subscribers) {
    const id = resolveChatId(sub);
    if (id) chatIds.push(id);
  }

  // Helper sleep
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  for (let i = 0; i < chatIds.length; i += batchSize) {
    const batch = chatIds.slice(i, i + batchSize);

    // map to promises that swallow errors to avoid Promise.all rejecting early
    const promises = batch.map((chatId) => {
      const payload = Object.assign({ chat_id: chatId }, payloadTemplate);
      return sendMessage(botToken, payload).catch((err) => {
        console.error(`Sanity: failed to send notification to ${chatId}:`, err);
        return null; // swallow error for this recipient
      });
    });

    // run the batch in parallel
    await Promise.all(promises);

    // wait between batches unless this was the last
    if (i + batchSize < chatIds.length) {
      try {
        await sleep(batchDelayMs);
      } catch (err) {
        // ignore
      }
    }
  }

  return new Response("ok", { status: 200 });
}

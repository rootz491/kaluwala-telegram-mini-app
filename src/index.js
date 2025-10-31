import { handleTelegramUpdate } from "./routes/telegram.js";
import { handleSanityWebhook } from "./routes/sanity.js";
import { handleSubscribeEndpoint } from "./routes/subscribe.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response("Telegram MiniApp Worker: OK", { status: 200 });
    }

    if (url.pathname === "/sanity-webhook") {
      return handleSanityWebhook(request, env);
    }

    // HTTP subscribe endpoint (external systems can POST to register a subscriber)
    if (url.pathname === "/subscribe") {
      return handleSubscribeEndpoint(request, env);
    }

    if (request.method === "POST") {
      return handleTelegramUpdate(request, env);
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};

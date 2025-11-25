import { handleTelegramUpdate } from "./routes/telegram.js";
import { handleSanityWebhook } from "./routes/sanity.js";
import { handleSubscribeEndpoint } from "./routes/subscribe.js";
import { handleNotifyWebhook } from "./routes/notify.js";
import { handleSeedWebhook } from "./routes/seed.js";
import { handleAuthWebhook } from "./routes/auth.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response("Telegram MiniApp Worker: OK", { status: 200 });
    }

    if (url.pathname === "/sanity-webhook") {
      return handleSanityWebhook(request, env);
    }

    if (url.pathname === "/subscribe") {
      return handleSubscribeEndpoint(request, env);
    }

    if (url.pathname === "/notify") {
      return handleNotifyWebhook(request, env);
    }

    if (url.pathname === "/seed") {
      return handleSeedWebhook(request, env);
    }

    if (url.pathname === "/auth") {
      return handleAuthWebhook(request, env);
    }

    if (request.method === "POST") {
      return handleTelegramUpdate(request, env);
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};

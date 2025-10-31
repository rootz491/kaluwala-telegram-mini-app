/**
 * Cloudflare Worker to handle Telegram webhook updates and respond to /start
 * Sends an inline keyboard button that opens a Web App (your blog) inside Telegram.
 *
 * Environment variables (set via `wrangler secret put`):
 * - BOT_TOKEN (required): Telegram bot token (123456:ABC-...)
 * - WEBHOOK_SECRET (optional): secret token to verify incoming webhook header
 * - BLOG_URL (optional): URL to open in Telegram Web App (defaults to https://myblog.example.com)
 *
 * No external Node modules used — only standard Cloudflare Worker APIs.
 */

import { handleTelegramUpdate } from "./routes/telegram.js";
import { handleSanityWebhook } from "./routes/sanity.js";

// Main entrypoint for the Worker - routes requests to feature handlers.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health-check for GET
    if (request.method === "GET") {
      return new Response("Telegram MiniApp Worker: OK", { status: 200 });
    }

    // Sanity webhook has its own path
    if (url.pathname === "/sanity-webhook") {
      return handleSanityWebhook(request, env);
    }

    // All Telegram webhook traffic is POSTed to the Worker root by default
    if (request.method === "POST") {
      return handleTelegramUpdate(request, env);
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};

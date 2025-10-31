# Telegram Mini-App Bot (Cloudflare Worker)

This project provides a Cloudflare Worker that acts as a Telegram bot which can send users an "Open Blog" button that opens your blog inside Telegram's Web App view.

## What this does
- Receives Telegram webhook updates.
- Responds to the `/start` command by sending a message with an inline keyboard button.
- The button opens `https://kaluwala.in` inside Telegram's Web App (and falls back to opening the URL if Web App is unsupported).

## Files
- `src/index.js` - Cloudflare Worker source code (webhook handler, Telegram API calls).
- `wrangler.toml` - Wrangler config for deploying the Worker.
- `package.json` - minimal scripts (`wrangler` in devDependencies).
- `.gitignore` - recommended ignores.

## Prerequisites
- Node.js (for installing wrangler locally if desired)
- A Cloudflare account
- A Telegram Bot token (create one via @BotFather)

## Setup & Deployment

1. Install Wrangler (if needed) and dependencies:
   ```bash
   npm install
   # or install wrangler globally if you prefer:
   # npm install -g wrangler
   ```

2. Login to Cloudflare from your machine:
   ```bash
   npm run login
   ```

3. Add your Telegram bot token as a secret (recommended):
   ```bash
   # Example:
   wrangler secret put BOT_TOKEN
   # Paste your bot token when prompted (e.g. 123456:ABC-DEF...)
   ```

   Optionally, set a webhook secret token to improve security:
   ```bash
   wrangler secret put WEBHOOK_SECRET
   # This value will be validated against the X-Telegram-Bot-Api-Secret-Token header sent by Telegram.
   ```

4. Deploy (publish) the Worker:
   ```bash
   npm run deploy
   ```
   After publishing, Wrangler will output the Worker URL (or your custom domain if configured). Note that if you've not provided `account_id` in `wrangler.toml` you may be prompted or Wrangler will use the account tied to your login.

## Set the Telegram Webhook

Once you have a Worker URL (for example `https://telegram-miniapp-bot.example.workers.dev`), set the Telegram webhook to point to it. Replace placeholders below.

- If you did NOT set a webhook secret:
  ```bash
  curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
    -d "url=https://<YOUR_WORKER_URL>/"
  ```

- If you set a `WEBHOOK_SECRET` and want Telegram to include it in webhook headers:
  ```bash
  curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
    -d "url=https://<YOUR_WORKER_URL>/" \
    -d "secret_token=<YOUR_WEBHOOK_SECRET>"
  ```

Important:
- Telegram will send the header `X-Telegram-Bot-Api-Secret-Token` with the secret token when you set one. The Worker will verify that header if `WEBHOOK_SECRET` is defined.

## How to test `/start`

1. Open the bot in Telegram (search by bot username) or open a chat with it.
2. Send the message: `/start`
3. The bot should reply with a message containing an "Open Blog" button. Tap it:
   - If your Telegram client supports Web Apps, it opens the blog inside Telegram's Web App view.
   - Otherwise it will open the blog URL in a browser.

## Changing the blog URL
The button currently points to:
```
https://myblog.example.com
```
Edit `src/index.js` and replace that URL, or adapt the Worker to read it from an environment variable or secret if you prefer.

## Best practices & notes
- Keep `BOT_TOKEN` secret: use `wrangler secret put BOT_TOKEN`.
- Use the webhook `secret_token` parameter to avoid unauthenticated requests.
- Validate incoming updates and respond quickly with a 200 to avoid Telegram retries.
- For more advanced flows (auth, passing user info to your Web App), follow Telegram's Web App docs: https://core.telegram.org/bots/webapps

## Troubleshooting
- If Telegram retries frequently, check Worker logs (wrangler tail or Cloudflare dashboard).
- If the bot returns "Forbidden", confirm `WEBHOOK_SECRET` matches the header value you set via `setWebhook`.
- To test locally, you can use `wrangler dev` for interactive development; note Telegram must reach your public webhook, so for full end-to-end testing deploy it or use a tunnel that maps to your Worker URL.

---
Short deployment checklist:
- wrangler login
- wrangler secret put BOT_TOKEN
- (optional) wrangler secret put WEBHOOK_SECRET
- npm run deploy
- set Telegram webhook with https://api.telegram.org/bot<token>/setWebhook?url=<worker_url>&secret_token=<secret>
- Test by sending `/start` to your bot
# Kaluwala telegram bot
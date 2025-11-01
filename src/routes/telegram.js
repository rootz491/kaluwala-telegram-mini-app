import { parseJson } from "../utils/http.js";
import {
  handleStartCommand,
  handleSubscribeCommand,
  handleCallbackQuery,
  handleWebAppData,
} from "./telegram/index.js";

/**
 * handleTelegramUpdate - main entry point for Telegram webhook updates.
 * - Parses the JSON body
 * - Routes to appropriate handlers based on update type
 * - Handles callback queries, web app data, and text commands
 */
export async function handleTelegramUpdate(request, env) {
  let update;
  try {
    update = await parseJson(request);
  } catch (err) {
    console.error("Telegram: Failed to parse JSON:", err);
    return new Response("Bad Request", { status: 400 });
  }

  // Handle callback_query from inline buttons
  if (update.callback_query) {
    try {
      await handleCallbackQuery(update.callback_query, env);
    } catch (err) {
      console.error("Telegram: CallbackQuery handler failed:", err);
    }
    return new Response("ok", { status: 200 });
  }

  // Extract message from various update types
  const message = update.message || update.edited_message;
  if (!message) {
    return new Response("ok", { status: 200 });
  }

  // Handle Web App sendData payload
  if (message.web_app_data) {
    try {
      await handleWebAppData(message, env);
    } catch (err) {
      console.error("Telegram: WebAppData handler failed:", err);
    }
    return new Response("ok", { status: 200 });
  }

  // Handle text commands
  const text = (message.text || "").trim();
  const chatId = message.chat?.id;

  if (!chatId) {
    return new Response("ok", { status: 200 });
  }

  // Route to command handlers
  if (text.toLowerCase().startsWith("/start")) {
    try {
      await handleStartCommand(message, env);
    } catch (err) {
      console.error("Telegram: Start command handler failed:", err);
    }
    return new Response("ok", { status: 200 });
  }

  if (text.toLowerCase().startsWith("/subscribe")) {
    try {
      await handleSubscribeCommand(message, env);
    } catch (err) {
      console.error("Telegram: Subscribe command handler failed:", err);
    }
    return new Response("ok", { status: 200 });
  }

  // Not a command we handle — acknowledge
  return new Response("ok", { status: 200 });
}

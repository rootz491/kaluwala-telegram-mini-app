import { parseJson } from "../utils/http.js";
import { addSubscriber } from "../services/subscribers/index.js";
import { sendMessage } from "../services/telegram/index.js";

/**
 * HTTP endpoint to register a new subscriber via POST JSON body.
 * Expected JSON fields:
 * - telegram_id OR chatId (required)
 * - first_name (optional)
 * - username (optional)
 *
 * Returns JSON: { persisted: boolean, backend?: string }
 */
export async function handleSubscribeEndpoint(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // security: require a secret header for raw HTTP subscribe calls
  const expectedSecret = env.HTTP_SECRET;
  if (expectedSecret) {
    const incomingSecret = request.headers.get("x-api-key") || "";
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  let body;
  try {
    body = await parseJson(request);
  } catch (err) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Accept either telegram_id or chatId
  const telegram_id =
    body.telegram_id || body.chatId || body.chat_id || body.chatId;
  const first_name = body.first_name || body.firstName || null;
  const username = body.username || null;

  if (!telegram_id) {
    return new Response(
      JSON.stringify({ error: "missing_field", field: "telegram_id" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const result = await addSubscriber(
      { chatId: telegram_id, first_name, username },
      env
    );

    // Check for validation error
    if (result.error === "invalid_user") {
      return new Response(
        JSON.stringify({ error: "invalid_telegram_user", persisted: false }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Optionally send a confirmation message if BOT_TOKEN available and subscription succeeded
    if (result.persisted) {
      try {
        if (env.BOT_TOKEN) {
          await sendMessage(env.BOT_TOKEN, {
            chat_id: telegram_id,
            text:
              body.confirmation_message ||
              "You've been subscribed to blog updates.",
          });
        }
      } catch (err) {
        // non-fatal: log and continue
        console.warn(
          "Subscribe endpoint: failed to send confirmation message:",
          err
        );
      }
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Subscribe endpoint: failed to add subscriber:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

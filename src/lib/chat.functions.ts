import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeChatMessage, type ChatMessageInput } from "@/lib/chat-gateway";

/**
 * The browser cannot write chat rows directly. The authenticated server call
 * delegates to one database transaction that re-checks identity, room state,
 * moderation, and the rolling rate limit before inserting.
 */
export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ChatMessageInput) => normalizeChatMessage(input))
  .handler(async ({ data, context }) => {
    const { data: message, error } = await context.supabase.rpc("send_chat_message", {
      _event_id: data.eventId,
      _body: data.body,
    });

    if (error) {
      const messageText = error.message.toLowerCase();
      if (messageText.includes("rate limit")) {
        throw new Error("You're sending messages too quickly. Wait a few seconds and try again.");
      }
      if (messageText.includes("moderation") || messageText.includes("banned")) {
        throw new Error("You cannot post in this room.");
      }
      if (messageText.includes("chat is unavailable")) {
        throw new Error("Chat is not accepting messages right now.");
      }
      throw new Error("Your message could not be sent. Try again.");
    }

    if (!message) throw new Error("Your message could not be sent. Try again.");
    return message;
  });

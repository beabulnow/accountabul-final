import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createTipIntent } from "@/lib/tips.functions";

export const Route = createFileRoute("/live/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Live room ${params.slug} — Accountabul` },
      {
        name: "description",
        content: "Watch the Accountabul conference room, join the chat, and tip the host.",
      },
      { property: "og:title", content: `Live room ${params.slug} — Accountabul` },
      {
        property: "og:description",
        content: "Watch the Accountabul conference room, join the chat, and tip the host.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveRoomPage,
});

function LiveRoomPage() {
  const { slug } = Route.useParams();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const event = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, slug, title, description, status, scheduled_start_at, ended_at, embed_url, replay_url_path, chat_enabled, tips_enabled, host_business_id",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const e = event.data;

  const reminder = useQuery({
    queryKey: ["reminder", userId, e?.id],
    enabled: Boolean(userId && e?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_reminders")
        .select("id")
        .eq("user_id", userId!)
        .eq("event_id", e!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleReminder = useMutation({
    mutationFn: async () => {
      if (!userId || !e) throw new Error("Sign in to set a reminder.");
      if (reminder.data) {
        const { error } = await supabase
          .from("event_reminders")
          .delete()
          .eq("id", reminder.data.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("event_reminders")
        .insert({ user_id: userId, event_id: e.id });
      if (error) throw error;
      return true;
    },
    onSuccess: (on) => {
      toast.success(on ? "Reminder set." : "Reminder removed.");
      void queryClient.invalidateQueries({ queryKey: ["reminder"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (event.isLoading) return <PageShell title="Loading room" description="Fetching this event." />;

  if (!e) {
    return (
      <PageShell
        eyebrow="Conference room"
        title="Event not found"
        description="This room does not exist or was canceled."
      >
        <Link to="/live" className="text-sm text-accent underline">
          Back to live events
        </Link>
      </PageShell>
    );
  }

  const playable =
    e.status === "live"
      ? e.embed_url
      : e.status === "replay_available"
        ? (e.replay_url_path ?? e.embed_url)
        : null;

  return (
    <PageShell
      eyebrow={e.status.replace("_", " ")}
      title={e.title}
      description={formatDateTime(e.scheduled_start_at)}
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-secondary">
            {playable ? (
              <iframe
                src={playable}
                title={e.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="size-full"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="font-medium">
                  {e.status === "scheduled"
                    ? "This room has not started yet"
                    : "The stream has ended"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {e.status === "scheduled"
                    ? "Set a reminder and the room will open here when it goes live."
                    : "A replay appears here when the recording is published."}
                </p>
              </div>
            )}
          </div>

          <section className="surface-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              About this room
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
              {e.description ?? "No description provided."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={!userId || toggleReminder.isPending}
                onClick={() => toggleReminder.mutate()}
              >
                {reminder.data ? "Remove reminder" : "Remind me"}
              </Button>
              {!userId ? (
                <Link to="/login" search={{}} className="self-center text-sm text-accent underline">
                  Sign in to participate
                </Link>
              ) : null}
            </div>
          </section>

          {e.tips_enabled ? <TipPanel eventId={e.id} /> : null}
        </div>

        {e.chat_enabled ? (
          <ChatPanel eventId={e.id} />
        ) : (
          <aside className="surface-card p-6">
            <h2 className="font-semibold">Chat is off</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The host disabled chat for this room.
            </p>
          </aside>
        )}
      </div>
    </PageShell>
  );
}

function ChatPanel({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["chat", eventId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, body, kind, created_at, user_id, is_hidden")
        .eq("event_id", eventId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!userId) throw new Error("Sign in to join the chat.");
      if (!text) throw new Error("Write a message first.");
      if (text.length > 500) throw new Error("Messages are limited to 500 characters.");
      const { error } = await supabase
        .from("chat_messages")
        .insert({ event_id: eventId, user_id: userId, body: text });
      if (error)
        throw new Error(
          error.message.includes("row-level security")
            ? "You cannot post in this room."
            : error.message,
        );
    },
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["chat", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <aside className="surface-card flex h-[32rem] flex-col p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Room chat
      </h2>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {!userId ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/login" search={{}} className="text-accent underline">
              Sign in
            </Link>{" "}
            to read and join the chat.
          </p>
        ) : null}
        {userId && messages.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : null}
        {messages.data?.map((m) => (
          <div key={m.id} className="rounded-md bg-secondary/60 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">
              {m.user_id === userId ? "You" : `Member ${m.user_id.slice(0, 6)}`} ·{" "}
              {formatDateTime(m.created_at)}
            </p>
            <p className={m.kind === "tip" ? "mt-1 font-medium text-accent" : "mt-1"}>{m.body}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={userId ? "Message the room" : "Sign in to chat"}
          maxLength={500}
          disabled={!userId}
          aria-label="Chat message"
        />
        <Button type="submit" disabled={!userId || send.isPending}>
          Send
        </Button>
      </form>
    </aside>
  );
}

function TipPanel({ eventId }: { eventId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const tip = useServerFn(createTipIntent);

  const submit = useMutation({
    mutationFn: async ({
      attemptId,
      submittedAmount,
      submittedMessage,
    }: {
      attemptId: string;
      submittedAmount: string;
      submittedMessage: string;
    }) => {
      const dollars = Number(submittedAmount.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(dollars) || dollars < 1)
        throw new Error("Enter an amount of $1 or more.");
      return tip({
        data: {
          eventId,
          amountMinor: Math.round(dollars * 100),
          attemptId,
          message: submittedMessage,
        },
      });
    },
    onSuccess: (result) => {
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      toast.success(
        `Tip of ${formatMoney(Math.round(Number(amount) * 100))} recorded. ${result.note}`,
      );
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tip the host
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tips are confirmed by the payment provider. Nothing is marked paid from your browser.
      </p>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({
            attemptId: crypto.randomUUID(),
            submittedAmount: amount,
            submittedMessage: message,
          });
        }}
      >
        <Input
          className="w-28"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="Tip amount in dollars"
        />
        <Input
          className="min-w-[12rem] flex-1"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note (optional)"
          aria-label="Tip message"
        />
        <Button type="submit" disabled={!userId || submit.isPending}>
          {submit.isPending ? "Starting…" : "Send tip"}
        </Button>
      </form>
      {!userId ? <p className="mt-2 text-xs text-muted-foreground">Sign in to tip.</p> : null}
    </section>
  );
}

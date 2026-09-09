import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, MessageCircle, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendChat } from "@/lib/chat.functions";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm Fahad's assistant. Ask me about his background, or how to book a meeting with him.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const doSendChat = useServerFn(sendChat);

  useEffect(() => {
    if (open && messages.length === 0) setMessages([WELCOME]);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const result = await doSendChat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (error) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Sorry, something went wrong. Try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[480px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" aria-hidden />
              <span className="font-mono text-sm font-semibold">assistant</span>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={[
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-accent text-foreground",
                ].join(" ")}
              >
                {message.content}
              </div>
            ))}
            {pending && (
              <div className="max-w-[85%] rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground">
                <span className="animate-pulse">…</span>
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-border/60 p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything…"
              maxLength={2000}
              aria-label="Message"
            />
            <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>
      )}

      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <MessageCircle className="h-5 w-5" aria-hidden />}
      </Button>
    </div>
  );
}

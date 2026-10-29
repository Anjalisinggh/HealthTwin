"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, FileText, Phone, RotateCcw, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { Markdown } from "@/components/ui/Markdown";
import { TierPill } from "@/components/ui/SafetyNote";
import { useHealth } from "@/lib/store/HealthStore";
import { repository } from "@/lib/repository";
import type { CompanionReply } from "@/lib/ai/companion";
import { followUp } from "@/lib/care";
import { fmtDate, fmtMonth } from "@/lib/trends";
import { cn } from "@/lib/cn";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  reply?: CompanionReply;
  pending?: boolean;
}

const STARTERS = [
  { label: "Summarise my health", hint: "A plain-language overview" },
  { label: "Explain my latest report", hint: "What the numbers mean" },
  { label: "Prepare for my doctor visit", hint: "Questions and a summary" },
  { label: "Why am I feeling tired lately?", hint: "Using your sleep and labs" },
];

export default function ChatPage() {
  return (
    <Suspense>
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const { profile, records, readings, context } = useHealth();
  const params = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const queued = useRef<string | null>(params.get("q"));

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || !profile) return;
      const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      const pendingId = `a-${Date.now()}`;
      const history = [...messages, userMsg];
      setMessages([...history, { id: pendingId, role: "assistant", content: "", pending: true }]);
      setInput("");
      setBusy(true);
      try {
        // The server answers from saved data, so send any queued changes first
        await repository.flush();
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reply = (await res.json()) as CompanionReply;
        setMessages((ms) => ms.map((m) => (m.id === pendingId ? { ...m, pending: false, content: reply.content, reply } : m)));
      } catch {
        setMessages((ms) =>
          ms.map((m) => (m.id === pendingId ? { ...m, pending: false, content: "Something went wrong reaching HealthTwin. Please try again." } : m)),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, profile],
  );

  // Deep link: /chat?q=...
  useEffect(() => {
    if (queued.current && profile) {
      const q = queued.current;
      queued.current = null;
      router.replace("/chat");
      void send(q);
    }
  }, [profile, router, send]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (!profile || !context) return null;

  const empty = messages.length === 0;
  const fu = followUp(context);
  const ready = records.filter((r) => r.status === "ready").length;

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line bg-bg/90 px-3 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur-xl">
        <Link href="/today" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <div className="leading-tight">
            <div className="text-[14.5px] font-medium">HealthTwin</div>
            <div className="flex items-center gap-1 text-[11px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Knows your history
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          disabled={empty}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3 disabled:opacity-0"
          aria-label="New conversation"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </header>

      {/* Thread */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="px-5 py-6">
          {empty ? (
            <div className="animate-rise">
              <h1 className="text-[38px] leading-[1.04]">
                How can I help,
                <br />
                <span className="italic text-brand-700">{profile.user.name}?</span>
              </h1>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
                I can see your {profile.conditions.length} conditions, {profile.medications.length} medications, {ready} records and {readings.length}{" "}
                readings. Ask anything in your own words.
              </p>

              <div className="mt-6 grid gap-2.5">
                {STARTERS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.label)}
                    className="card animate-rise flex items-center gap-3 px-4 py-3.5 text-left card-hover"
                    style={{ animationDelay: `${80 + i * 50}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[14.5px] font-medium">{s.label}</span>
                      <span className="block text-[12px] text-ink-3">{s.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Talk to a person */}
              <div className="eyebrow mb-2 mt-8">Talk to a person</div>
              <div className="card divide-y divide-line overflow-hidden">
                {fu && (
                  <Link href="/care#appointments" className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-3">
                      <Stethoscope className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium">{fu.provider}</span>
                      <span className="block text-[12px] text-ink-3">Your doctor · review due {fmtMonth(fu.due)}</span>
                    </span>
                  </Link>
                )}
                <div className="flex items-center gap-3.5 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-urgent-bg text-urgent">
                    <Phone className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium">In an emergency</span>
                    <span className="block text-[12px] text-ink-3">Call your local emergency number. In India, dial 112.</span>
                  </span>
                </div>
              </div>

              <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-ink-3">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Answers are informational and based on what you’ve shared. They don’t replace a
                diagnosis from your doctor.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} onFollowUp={send} />
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-bg/90 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-[26px] border border-line bg-surface p-1.5 pl-4 shadow-sm transition-colors focus-within:border-brand-400"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your health…"
            className="max-h-32 flex-1 resize-none bg-transparent py-2.5 text-[15px] placeholder:text-ink-4 focus:outline-none"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-on-brand transition-all hover:bg-brand-800 disabled:bg-surface-3 disabled:text-ink-4"
            aria-label="Send"
          >
            <ArrowUp className="h-[18px] w-[18px]" />
          </button>
        </form>
        <p className="mt-2 text-center text-[10.5px] text-ink-4">Not a substitute for medical advice · Updated {fmtDate(profile.updatedAt.slice(0, 10))}</p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onFollowUp }: { msg: Msg; onFollowUp: (t: string) => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex animate-rise justify-end">
        <div className="max-w-[82%] rounded-[22px] rounded-br-md bg-brand-700 px-4 py-2.5 text-[15px] leading-relaxed text-on-brand">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="animate-rise">
      {msg.pending ? (
        <div className="flex items-center gap-1.5 py-2" aria-label="HealthTwin is thinking">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-300" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      ) : (
        <>
          {msg.reply && msg.reply.tier !== "info" && (
            <div className="mb-2">
              <TierPill tier={msg.reply.tier} />
            </div>
          )}
          <div
            className={cn(
              "rounded-[22px] rounded-tl-md border px-4 py-3.5 text-[15px] leading-relaxed text-ink-2",
              msg.reply?.tier === "urgent" ? "border-urgent/25 bg-urgent-bg" : "border-line bg-surface shadow-sm",
            )}
          >
            <Markdown text={msg.content} />
          </div>
          {msg.reply && msg.reply.sources.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-ink-3">Sources</span>
              {msg.reply.sources.map((s) => (
                <Link
                  key={s.id}
                  href={`/records/${s.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:border-brand-300 hover:text-brand-700"
                >
                  <FileText className="h-3 w-3" /> {s.title} · {fmtMonth(s.date)}
                </Link>
              ))}
            </div>
          )}
          {msg.reply && msg.reply.followUps.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {msg.reply.followUps.map((f) => (
                <button
                  key={f}
                  onClick={() => onFollowUp(f)}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12.5px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

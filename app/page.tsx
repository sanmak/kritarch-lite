"use client";

import { useState } from "react";

const DOMAINS = [
  { id: "finance", label: "Finance" },
  { id: "healthcare", label: "Healthcare" },
  { id: "legal", label: "Legal" },
  { id: "general", label: "General" },
] as const;

type DebateStatus = "idle" | "running" | "complete" | "error";

export default function Home() {
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]["id"]>("finance");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DebateStatus>("idle");
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startDebate = async () => {
    setStatus("running");
    setEvents([]);
    setError(null);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, domain }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to start debate.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const json = line.replace(/^data: /, "");
          try {
            const event = JSON.parse(json) as { type?: string };
            setEvents((prev) => [...prev, JSON.stringify(event)]);
            if (event.type === "complete") {
              setStatus("complete");
            }
          } catch {
            setEvents((prev) => [...prev, json]);
          }
        }
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Kritarch Lite — AI Jury</h1>
          <p className="text-zinc-400">
            Multi‑agent debate with real‑time streaming and consensus synthesis.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-wrap gap-3">
            {DOMAINS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDomain(item.id)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  domain === item.id
                    ? "border-blue-400 bg-blue-500/10 text-blue-200"
                    : "border-zinc-700 text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100"
              placeholder="Enter your question or claim..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startDebate}
                disabled={!query || status === "running"}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "running" ? "Debate running..." : "Start Debate"}
              </button>
              <span className="text-xs text-zinc-400">
                Status: {status}
              </span>
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Streaming Events</h2>
          <div className="mt-3 max-h-80 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-200">
            {events.length === 0 ? (
              <p className="text-zinc-500">No events yet.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((event, index) => (
                  <li key={`${event}-${index}`} className="break-all">
                    {event}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

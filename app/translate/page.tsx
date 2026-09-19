"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import {
  Disclaimer,
  Shell,
  ResultCard,
  type ResultStatus,
} from "@/components/site-shell";
import { FileDropzone } from "@/components/file-dropzone";

type Output = { id: string; title: string; date: string };
type ResultItem = {
  term: string;
  value: string;
  plainMeaning: string;
  range: string | null;
  status: ResultStatus;
  why: string;
};
type TranslateResult = { items: ResultItem[]; questions: string[] };

const sample =
  "Hemoglobin A1c (HbA1c): 6.1%\nLDL cholesterol: 118 mg/dL\nVitamin D: 19 ng/mL";

const KNOWN_STATUSES: readonly unknown[] = ["normal", "borderline", "flagged"];

/** The model output is untrusted: coerce every field to a safe shape. */
function normalizeResult(data: unknown): TranslateResult {
  const raw = (data ?? {}) as { items?: unknown; questions?: unknown };
  const items = Array.isArray(raw.items) ? raw.items : [];
  const questions = Array.isArray(raw.questions) ? raw.questions : [];
  return {
    items: items
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map((i) => ({
        term: String(i.term ?? "Result"),
        value: String(i.value ?? "—"),
        plainMeaning: String(i.plainMeaning ?? ""),
        range: typeof i.range === "string" && i.range.trim() ? i.range : null,
        status: KNOWN_STATUSES.includes(i.status)
          ? (i.status as ResultStatus)
          : "unknown",
        why: String(i.why ?? ""),
      })),
    questions: questions.filter((q): q is string => typeof q === "string"),
  };
}

export default function TranslatePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  const done = results !== null;

  // Move focus to the results so keyboard and screen-reader users land on them.
  useEffect(() => {
    if (results) {
      resultsHeading.current?.focus();
      resultsHeading.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  }, [results]);

  const translate = async () => {
    if (!text.trim() && !attachment) {
      setError(
        "Paste some medical text or upload a document first, or use the example to see how it works.",
      );
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);
    let succeeded = false;
    try {
      // With a file we send multipart form data; otherwise plain JSON.
      let r: Response;
      if (attachment) {
        const form = new FormData();
        form.append("file", attachment);
        if (text.trim()) form.append("text", text);
        r = await fetch("/api/translate", { method: "POST", body: form });
      } else {
        r = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        setError(
          body?.error ??
            "We couldn't translate this right now. Please try again.",
        );
        return;
      }
      const normalized = normalizeResult(body);
      if (normalized.items.length === 0) {
        setError(
          "We couldn't find any test results in this document. Try a clearer photo or paste the text instead.",
        );
        return;
      }
      setResults(normalized);
      succeeded = true;
    } catch {
      setError(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
      if (succeeded) {
        try {
          const history: Output[] = JSON.parse(
            localStorage.getItem("perspiq-history") || "[]",
          );
          history.unshift({
            id: crypto.randomUUID(),
            title: attachment?.name || "Medical document",
            date: new Date().toISOString(),
          });
          localStorage.setItem(
            "perspiq-history",
            JSON.stringify(history.slice(0, 20)),
          );
        } catch {
          /* history is a nice-to-have; never block results on storage errors */
        }
      }
    }
  };

  return (
    <Shell>
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Your private clarity space
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Translate your medical document
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Paste the words that feel confusing, or upload your results.
            We&apos;ll organize them into clear explanations to help you prepare
            for a conversation with your care team.
          </p>
          <div className="mt-8">
            <Disclaimer dismissible />
          </div>
          <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="document" className="text-lg font-semibold">
                Document text
              </label>
              {text && (
                <button
                  onClick={() => {
                    setText("");
                    setResults(null);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted"
                >
                  <Trash2 aria-hidden="true" /> Clear
                </button>
              )}
            </div>
            <textarea
              id="document"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste lab results, a prescription, or discharge summary here…"
              className="mt-4 min-h-52 w-full resize-y rounded-2xl border border-input bg-background p-4 leading-7 outline-none focus:ring-2 focus:ring-ring"
              aria-describedby="document-help"
            />
            <p
              id="document-help"
              className="mt-2 text-sm text-muted-foreground"
            >
              Don&apos;t include your name, address, or other identifying
              details. You can paste text, upload a file, or both.
            </p>
            <FileDropzone
              className="mt-5"
              disabled={loading}
              onFileSelected={(f) => {
                setAttachment(f);
                setError("");
                setResults(null);
              }}
              onClear={() => setAttachment(null)}
              onError={() => setAttachment(null)}
            />
            <div className="mt-3">
              <button
                onClick={translate}
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />{" "}
                    Translating…
                  </>
                ) : (
                  <>
                    <Sparkles aria-hidden="true" /> Translate clearly
                  </>
                )}
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-900"
              >
                {error}
              </p>
            )}
            <p aria-live="polite" className="sr-only">
              {loading
                ? "Perspiq is reading your document."
                : results
                  ? `Your explanation is ready. ${results.items.length} results found.`
                  : ""}
            </p>
          </section>
          {results && (
            <section className="mt-10" aria-labelledby="results-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                    Your explanation
                  </p>
                  <h2
                    id="results-title"
                    ref={resultsHeading}
                    tabIndex={-1}
                    className="mt-2 scroll-mt-24 text-2xl font-semibold outline-none"
                  >
                    Here&apos;s what we found
                  </h2>
                </div>
                <Link
                  href="/history"
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  View history
                </Link>
              </div>
              <div className="mt-5 flex flex-col gap-4">
                {results.items.map((item, i) => (
                  <ResultCard
                    key={`${item.term}-${i}`}
                    term={item.term}
                    value={item.value}
                    status={item.status}
                    range={item.range}
                    meaning={item.plainMeaning}
                    note={item.why}
                  />
                ))}
              </div>
              {results.questions.length > 0 && (
                <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <h2 className="font-semibold">Questions to ask your doctor</h2>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                    {results.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}{" "}
          {!done && (
            <button
              onClick={() => setText(sample)}
              className="mt-6 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Use a sample document
            </button>
          )}
        </div>
      </main>
    </Shell>
  );
}
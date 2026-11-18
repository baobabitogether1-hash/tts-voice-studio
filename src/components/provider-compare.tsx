import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { speechLanguages } from "@/lib/fish-audio";
import {
  applyPlaybackRate,
  PLAYBACK_MAX,
  PLAYBACK_MIN,
  SIGNED_OUT_WARNING,
  ttsRequestHeaders,
  useAccessToken,
  useSignedIn,
} from "@/lib/tts-client";

const ALL = ["google", "lovable", "openrouter", "gemini", "openai", "elevenlabs", "deepgram"] as const;
type Result = { provider: string; ok: boolean; url?: string; text?: string | undefined; ms: number; error?: string };
const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ProviderCompare() {
  const [text, setText] = useState("good morning");
  const [lang, setLang] = useState("en");
  const [target, setTarget] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [accessToken] = useAccessToken();
  const signedIn = useSignedIn();

  useEffect(() => () => results.forEach((r) => r.url && URL.revokeObjectURL(r.url)), [results]);

  async function generate() {
    setBusy(true);
    setResults([]);
    let headers: Headers;
    try {
      headers = await ttsRequestHeaders(accessToken);
    } catch (e) {
      setBusy(false);
      setResults([{ provider: "session", ok: false, ms: 0, error: e instanceof Error ? e.message : String(e) }]);
      return;
    }
    // Voices and speed are left out: each provider uses its own default voice at normal speed.
    const out = await Promise.all(
      ALL.map(async (provider): Promise<Result> => {
        const t = performance.now();
        try {
          const res = await fetch("/api/public/tts", {
            method: "POST",
            headers,
            body: JSON.stringify({ text, lang, provider, ...(target && { target_lang: target }) }),
          });
          const ms = Math.round(performance.now() - t);
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: unknown };
            return { provider, ok: false, ms, error: typeof err.error === "string" ? err.error : `HTTP ${res.status}` };
          }
          const spoken = res.headers.get("X-Spoken-Text");
          return { provider, ok: true, ms, url: URL.createObjectURL(await res.blob()), text: spoken ? decodeURIComponent(spoken) : undefined };
        } catch (e) {
          return { provider, ok: false, ms: Math.round(performance.now() - t), error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    setResults(out);
    setKeep(Object.fromEntries(out.map((r) => [r.provider, r.ok])));
    setBusy(false);
  }

  const chosen = results.filter((r) => keep[r.provider]).map((r) => r.provider);

  return (
    <section className="mt-8 space-y-4 rounded-xl border border-border p-4">
      <h2 className="text-base font-semibold">Compare all providers</h2>
      <p className="text-sm text-muted-foreground">Make the same phrase with every provider, listen to each, and tick the ones that sound right.</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input aria-label="Text to compare" className={field} value={text} onChange={(e) => setText(e.target.value)} />
        <select aria-label="Source language" className={field} value={lang} onChange={(e) => setLang(e.target.value)}>
          {speechLanguages.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <select aria-label="Translate to" className={field} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">No translation</option>
          {speechLanguages.map(([c, n]) => <option key={c} value={c}>→ {n}</option>)}
        </select>
      </div>
      {signedIn === false && !accessToken.trim() && (
        <p role="status" className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          {SIGNED_OUT_WARNING}{" "}
          <Link to="/tokens" className="font-medium text-foreground underline underline-offset-4">
            Use an access token
          </Link>{" "}
          or{" "}
          <Link to="/account" className="font-medium text-foreground underline underline-offset-4">
            sign in
          </Link>
          .
        </p>
      )}
      <label className="block text-xs text-muted-foreground">
        Playback speed: {speed}x
        <input
          aria-label="Comparison playback speed"
          className="w-full accent-foreground"
          type="range"
          min={PLAYBACK_MIN}
          max={PLAYBACK_MAX}
          step="0.25"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </label>
      <Button onClick={() => void generate()} disabled={busy || !text.trim()}>
        {busy ? "Generating with all providers…" : "Generate with all providers"}
      </Button>
      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.provider} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={!!keep[r.provider]} disabled={!r.ok}
                    onChange={(e) => setKeep((k) => ({ ...k, [r.provider]: e.target.checked }))} />
                  {r.provider}
                </label>
                <span className="text-xs text-muted-foreground">{r.ms} ms</span>
                {r.ok ? <audio
                    controls
                    src={r.url}
                    ref={(el) => applyPlaybackRate(el, speed)}
                    onLoadedMetadata={(e) => applyPlaybackRate(e.currentTarget, speed)}
                    className="h-9 min-w-0 flex-1"
                  /> : <span className="flex-1 break-all text-destructive">{r.error}</span>}
              </div>
              {r.text && <p className="mt-1 text-xs text-muted-foreground">Spoken: {r.text}</p>}
            </li>
          ))}
        </ul>
      )}
      {results.length > 0 && (
        <div className="text-sm">
          <p className="font-medium">Your working list ({chosen.length})</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs">{`providers=${chosen.join(",")}`}</pre>
          <Button variant="outline" size="sm" className="mt-2" disabled={!chosen.length}
            onClick={() => void navigator.clipboard.writeText(chosen.join(","))}>Copy list</Button>
        </div>
      )}
    </section>
  );
}

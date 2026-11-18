import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccessToken } from "@/lib/tts-client";

type ProviderKey = {
  id: string;
  service: string;
  key_suffix: string;
  status: string;
  failures: number;
  code: number | null;
  created_at: string;
  last_used: string | null;
  quarantined_until: string | null;
};
type KeyEvent = {
  id: number;
  key_id: string;
  occurred_at: string;
  action: "request" | "test";
  response_code: number;
};
type ApiToken = {
  id: string;
  label: string;
  created_at: string;
  last_used: string | null;
  revoked_at: string | null;
};
type TokenData = { keys: ProviderKey[]; history: KeyEvent[]; tokens: ApiToken[] };
type TempKeyEntry = { id: string; service: string; key: string };

const providerNames: Record<string, string> = {
  openrouter: "OpenRouter",
  lovable: "Lovable AI",
  gemini: "Google Gemini",
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
  deepgram: "Deepgram",
};
const providerLimits: Record<string, string> = {
  openrouter:
    "Key status and account usage/remaining limits may be returned by OpenRouter. Model-specific limits still apply.",
  lovable: "Authentication only; this view cannot retrieve billing, credit, or rate-limit details.",
  gemini: "Authentication only; quota, billing, and model access are controlled by Google.",
  openai:
    "Authentication only; billing, project budgets, rate limits, and model permissions are not checked.",
  elevenlabs:
    "Authentication only; subscription, character quota, and rate limits are not checked.",
  deepgram: "Authentication only; balance, project quota, and rate limits are not checked.",
};

const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function isAvailable(key: ProviderKey) {
  return key.status !== "blocked" && key.status !== "quarantined";
}

function availabilityLabel(key: ProviderKey) {
  if (key.status === "blocked") {
    return `Blocked${key.code ? ` (last HTTP ${key.code})` : ""} — test the key or replace it`;
  }
  if (key.status === "quarantined") {
    return key.quarantined_until
      ? `Quarantined until ${new Date(key.quarantined_until).toLocaleString()}`
      : "Quarantined";
  }
  if (key.status === "untested") return "Available — not tested yet";
  if (key.status === "error") return "Available — last request failed";
  return "Available";
}

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export const Route = createFileRoute("/tokens")({
  head: () => ({
    meta: [
      { title: "Tokens and provider key activity — Speak API" },
      {
        name: "description",
        content:
          "Create temporary access tokens, activate a bearer token for the playground, and review account key activity.",
      },
      { property: "og:title", content: "Tokens and provider key activity — Speak API" },
      {
        property: "og:description",
        content: "Manage Speak API access tokens and provider key activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tokens,
});

function Tokens() {
  const [accessToken, setAccessToken] = useAccessToken();
  const [tokenInput, setTokenInput] = useState("");
  const [tempService, setTempService] = useState<string>("openrouter");
  const [tempKeyInput, setTempKeyInput] = useState("");
  const [tempEntries, setTempEntries] = useState<TempKeyEntry[]>([]);
  const [tempBusy, setTempBusy] = useState(false);
  const [tempError, setTempError] = useState("");
  const [tempMessage, setTempMessage] = useState("");
  const [freshTempToken, setFreshTempToken] = useState<{
    token: string;
    expires_at: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [supabaseAvailable, setSupabaseAvailable] = useState(true);
  const [authUnavailable, setAuthUnavailable] = useState("");
  const [data, setData] = useState<TokenData>({ keys: [], history: [], tokens: [] });
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTokenInput(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!import.meta.env["VITE_SUPABASE_URL"] || !import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) {
      setSupabaseAvailable(false);
      setLoadingSession(false);
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) setSession(nextSession);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void supabase.auth
        .getSession()
        .then(({ data: sessionData }) => {
          if (active) {
            setSession(sessionData.session);
            setLoadingSession(false);
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setError(reason instanceof Error ? reason.message : String(reason));
            setLoadingSession(false);
          }
        });
    } catch (reason) {
      setAuthUnavailable(reason instanceof Error ? reason.message : String(reason));
      setLoadingSession(false);
    }
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setData({ keys: [], history: [], tokens: [] });
      return;
    }
    let active = true;
    setLoadingData(true);
    setError("");
    const headers = { Authorization: `Bearer ${session.access_token}` };
    void Promise.all([
      fetch("/api/user/provider-keys", { headers }),
      fetch("/api/user/token", { headers }),
    ])
      .then(async ([keysResponse, tokenResponse]) => {
        const [keysBody, tokenBody] = await Promise.all([
          keysResponse.json(),
          tokenResponse.json(),
        ]);
        if (!keysResponse.ok) throw new Error(keysBody.error || "Could not load provider keys");
        if (!tokenResponse.ok) throw new Error(tokenBody.error || "Could not load API tokens");
        if (active) {
          setData({
            keys: keysBody.keys as ProviderKey[],
            history: keysBody.history as KeyEvent[],
            tokens: tokenBody.tokens as ApiToken[],
          });
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  function addTempEntry() {
    const trimmed = tempKeyInput.trim();
    if (!trimmed) return;
    setTempEntries((current) => [
      ...current,
      { id: crypto.randomUUID(), service: tempService, key: trimmed },
    ]);
    setTempKeyInput("");
    setTempError("");
  }

  function removeTempEntry(id: string) {
    setTempEntries((current) => current.filter((item) => item.id !== id));
  }

  async function createTemporaryToken(event: FormEvent) {
    event.preventDefault();
    setTempError("");
    setTempMessage("");
    const entries = [...tempEntries];
    if (tempKeyInput.trim()) {
      entries.push({ id: "inline", service: tempService, key: tempKeyInput.trim() });
    }
    if (entries.length === 0) {
      setTempError("Add at least one provider key to create a temporary access token.");
      return;
    }

    const providerKeys: Record<string, string[]> = {};
    for (const entry of entries) {
      const list = providerKeys[entry.service] ?? [];
      if (!list.includes(entry.key)) list.push(entry.key);
      providerKeys[entry.service] = list;
    }

    setTempBusy(true);
    try {
      const response = await fetch("/api/public/access-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_keys: providerKeys }),
      });
      const body = (await response.json()) as {
        token?: string;
        expires_at?: string;
        error?: string;
      };
      if (!response.ok || !body.token) {
        throw new Error(body.error || "Could not create temporary access token.");
      }
      setAccessToken(body.token);
      setFreshTempToken({
        token: body.token,
        expires_at: body.expires_at ?? "",
      });
      setTempEntries([]);
      setTempKeyInput("");
      setTempMessage(
        "Temporary access token created and activated for this browser. You can generate speech without entering API keys on requests.",
      );
    } catch (reason) {
      setTempError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setTempBusy(false);
    }
  }

  async function revokeActiveTempToken() {
    if (!accessToken.startsWith("spt_")) return;
    setTempBusy(true);
    setTempError("");
    setTempMessage("");
    try {
      const response = await fetch("/api/public/access-token", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok && response.status !== 401) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not revoke temporary access token.");
      }
      setAccessToken("");
      setFreshTempToken(null);
      setTempMessage("Temporary access token revoked and cleared from this browser.");
    } catch (reason) {
      setTempError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setTempBusy(false);
    }
  }

  function saveBrowserToken(event: FormEvent) {
    event.preventDefault();
    setTempError("");
    setTempMessage("");
    setAccessToken(tokenInput);
    setTempMessage(
      tokenInput.trim()
        ? "Access token saved in this browser for Playground and API requests."
        : "Access token cleared from this browser.",
    );
  }

  async function copyFreshToken() {
    if (!freshTempToken) return;
    try {
      await navigator.clipboard.writeText(freshTempToken.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-foreground">
      <nav className="flex gap-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Back to speech
        </Link>
        <Link to="/docs" className="hover:text-foreground">
          API docs
        </Link>
        <Link to="/reports" className="hover:text-foreground">
          Usage
        </Link>
      </nav>
      <h1 className="mt-5 text-2xl font-semibold">Access tokens and key activity</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use an access token so audio generation requests never need raw provider API keys.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Active browser access token</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a personal token (<code>spk_…</code>) or temporary access token (<code>spt_…</code>)
          to send it automatically as <code>Authorization: Bearer …</code> from the{" "}
          <Link to="/" className="underline hover:text-foreground">
            Playground
          </Link>{" "}
          and{" "}
          <Link to="/docs" className="underline hover:text-foreground">
            API docs
          </Link>
          .
        </p>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={saveBrowserToken}>
          <input
            aria-label="Browser access token"
            className={`${field} min-w-60 flex-1 font-mono`}
            type="password"
            autoComplete="off"
            placeholder="Paste access token (spt_… or spk_…)"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
          />
          <Button type="submit" variant="outline">
            Save token
          </Button>
          {accessToken.trim() && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAccessToken("");
                setFreshTempToken(null);
                setTempMessage("Access token cleared from this browser.");
              }}
            >
              Clear
            </Button>
          )}
          {accessToken.startsWith("spt_") && (
            <Button
              type="button"
              variant="ghost"
              disabled={tempBusy}
              onClick={() => void revokeActiveTempToken()}
            >
              Revoke on server
            </Button>
          )}
        </form>
        {accessToken.trim() && (
          <p className="mt-2 text-xs text-muted-foreground">
            Active token: <code>••••{accessToken.trim().slice(-6)}</code>
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Create a temporary access token</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Works without an account. Bundle one or more provider API keys into a single expiring{" "}
          <code>spt_…</code> token held in server memory for 24 hours. Keys are never returned in
          audio responses or logs.
        </p>
        <form className="mt-4 space-y-3" onSubmit={(event) => void createTemporaryToken(event)}>
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
            <select
              aria-label="Temporary token provider"
              className={field}
              value={tempService}
              onChange={(event) => setTempService(event.target.value)}
            >
              {Object.entries(providerNames).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <input
              aria-label="Provider API key for temporary token"
              className={field}
              type="password"
              autoComplete="off"
              placeholder="Optional: paste a provider key to include in the token"
              value={tempKeyInput}
              onChange={(event) => setTempKeyInput(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!tempKeyInput.trim()}
              onClick={addTempEntry}
            >
              Add to list
            </Button>
          </div>
          {tempEntries.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {tempEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span>
                    {providerNames[entry.service] || entry.service} (
                    <code>••••{entry.key.slice(-4)}</code>)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTempEntry(entry.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={tempBusy || (!tempKeyInput.trim() && tempEntries.length === 0)}>
              {tempBusy ? "Creating…" : "Create temporary access token"}
            </Button>
            <Link to="/" className="text-sm text-muted-foreground underline hover:text-foreground">
              Go to Playground
            </Link>
          </div>
        </form>
        {tempMessage && (
          <p role="status" className="mt-3 text-sm text-green-700 dark:text-green-400">
            {tempMessage}
          </p>
        )}
        {tempError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {tempError}
          </p>
        )}
        {freshTempToken && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Copy this temporary token now (expires{" "}
                {freshTempToken.expires_at ? formatTime(freshTempToken.expires_at) : "in 24h"}).
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyFreshToken()}>
                {copiedToken ? "Copied!" : "Copy token"}
              </Button>
            </div>
            <code className="mt-2 block break-all text-xs">{freshTempToken.token}</code>
          </div>
        )}
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Account tokens & key activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal credentials only. Server-managed keys are not visible from this account page.
        </p>
        {loadingSession ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading account…</p>
        ) : !supabaseAvailable ? (
          <p className="mt-4 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Account-persisted tokens and saved provider keys require Supabase. Temporary access
            tokens above and anonymous Google speech requests work without Supabase.
          </p>
        ) : authUnavailable ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Account tokens and saved provider keys require Supabase. Public speech requests remain
            available. {authUnavailable}
          </p>
        ) : !session ? (
          <section className="mt-4 border border-border p-4">
            <p className="text-sm">Sign in to review your saved provider keys and personal tokens.</p>
            <Button asChild className="mt-3">
              <Link to="/account">Sign in or create an account</Link>
            </Button>
          </section>
        ) : (
          <>
            {loadingData && (
              <p className="mt-4 text-sm text-muted-foreground">Loading key details…</p>
            )}
            <section className="mt-6">
              <h3 className="text-base font-semibold">Personal API tokens</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tokens authenticate API requests; they do not include provider credits. Requests use
                your saved provider keys. Only token metadata is shown; token secrets cannot be
                retrieved.
              </p>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {data.tokens.length === 0 && (
                  <li className="py-3 text-sm text-muted-foreground">No personal tokens yet.</li>
                )}
                {data.tokens.map((token) => (
                  <li key={token.id} className="flex flex-wrap gap-x-6 gap-y-1 py-3 text-sm">
                    <span className="min-w-40 flex-1 font-medium">{token.label}</span>
                    <span
                      className={
                        token.revoked_at ? "text-destructive" : "text-green-700 dark:text-green-400"
                      }
                    >
                      {token.revoked_at ? "Revoked" : "Active"}
                    </span>
                    <span className="text-muted-foreground">
                      Created {formatTime(token.created_at)}
                    </span>
                    <span className="text-muted-foreground">
                      Last used {formatTime(token.last_used)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8 border-t border-border pt-6">
              <h3 className="text-base font-semibold">Saved provider keys</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Availability reflects this service’s routing state, not a live check of provider
                balance or quota. Select “Test key” in{" "}
                <Link to="/account" className="underline hover:text-foreground">
                  Account
                </Link>{" "}
                to verify credentials.
              </p>
              {data.keys.length === 0 ? (
                <p className="mt-3 border-y border-border py-3 text-sm text-muted-foreground">
                  No personal provider keys are saved.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {data.keys.map((key) => (
                    <li key={key.id} className="py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <span className="min-w-32 flex-1 font-medium">
                          {providerNames[key.service] || key.service}
                        </span>
                        <code className="text-muted-foreground">••••{key.key_suffix}</code>
                        <span
                          className={
                            isAvailable(key)
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          }
                        >
                          {availabilityLabel(key)}
                        </span>
                        <span className="text-muted-foreground">
                          Last used {formatTime(key.last_used)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {providerLimits[key.service] ||
                          "Provider billing, model access, and rate limits are not checked."}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8 border-t border-border pt-6">
              <h3 className="text-base font-semibold">Recent provider key history</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Up to 200 recent tests and synthesis attempts are shown. History begins with this
                feature; older requests cannot be attributed to an individual key. Response bodies
                and credentials are not stored.
              </p>
              {data.history.length === 0 ? (
                <p className="mt-3 border-y border-border py-3 text-sm text-muted-foreground">
                  No recorded provider key activity yet.
                </p>
              ) : (
                <ol className="mt-3 divide-y divide-border border-y border-border">
                  {data.history.map((event) => {
                    const key = data.keys.find((candidate) => candidate.id === event.key_id);
                    const succeeded = event.response_code >= 200 && event.response_code < 300;
                    return (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm"
                      >
                        <span className="min-w-32 flex-1">
                          {key
                            ? `${providerNames[key.service] || key.service} ••••${key.key_suffix}`
                            : "Removed provider key"}
                        </span>
                        <span className="capitalize text-muted-foreground">
                          {event.action === "test" ? "Key test" : "Synthesis"}
                        </span>
                        <span
                          className={
                            succeeded
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          }
                        >
                          {event.response_code === 599
                            ? "Network error"
                            : `HTTP ${event.response_code}`}
                        </span>
                        <time className="text-muted-foreground" dateTime={event.occurred_at}>
                          {formatTime(event.occurred_at)}
                        </time>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </>
        )}
        {error && (
          <p role="alert" className="mt-5 border border-destructive/40 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

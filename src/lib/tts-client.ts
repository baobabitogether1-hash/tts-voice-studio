import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACCESS_TOKEN_STORAGE_KEY = "speak-api.access-token";
const ACCESS_TOKEN_EVENT = "speak-api:access-token";

export const SIGNED_OUT_WARNING =
  "Google voices work without credentials. Other providers use a server-configured key, an access token, or your signed-in account.";

export function loadAccessToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveAccessToken(token: string) {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  try {
    if (trimmed) window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Storage unavailable; caller keeps its own in-memory state.
  }
  window.dispatchEvent(new Event(ACCESS_TOKEN_EVENT));
}

export function useAccessToken(): [string, (token: string) => void] {
  const [token, setTokenState] = useState("");

  useEffect(() => {
    const sync = () => setTokenState(loadAccessToken());
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACCESS_TOKEN_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(ACCESS_TOKEN_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ACCESS_TOKEN_EVENT, sync);
    };
  }, []);

  const setToken = (next: string) => {
    setTokenState(next.trim());
    saveAccessToken(next);
  };

  return [token, setToken];
}

/** JSON headers for /api/public/tts, with an access token or the signed-in user's session token. */
export async function ttsRequestHeaders(tokenOverride?: string): Promise<Headers> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const accessToken = tokenOverride?.trim() || loadAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
    return headers;
  }
  if (import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    // getSession refreshes an expired access token before returning it.
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.access_token) {
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
    }
  }
  return headers;
}

/** null until the session is known on the client, then whether someone is signed in. */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!import.meta.env["VITE_SUPABASE_URL"] || !import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) {
      setSignedIn(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

export const PLAYBACK_MIN = 0.25;
export const PLAYBACK_MAX = 4;

export function clampPlaybackRate(rate: number) {
  return Number.isFinite(rate) ? Math.min(PLAYBACK_MAX, Math.max(PLAYBACK_MIN, rate)) : 1;
}

/** Plays audio faster or slower in the browser while keeping the voice's natural pitch. */
export function applyPlaybackRate(el: HTMLAudioElement | null, rate: number) {
  if (!el) return;
  const value = clampPlaybackRate(rate);
  el.preservesPitch = true;
  el.defaultPlaybackRate = value;
  el.playbackRate = value;
}

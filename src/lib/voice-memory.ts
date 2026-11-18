// Remembers the voice picked for each provider in this browser.
export type RememberedVoice = { value: string; label: string };

const key = (provider: string) => `speak-api.voice.${provider}`;

export function loadVoice(provider: string): RememberedVoice | undefined {
  try {
    const raw = window.localStorage.getItem(key(provider));
    if (!raw) return undefined;
    const v = JSON.parse(raw) as Partial<RememberedVoice>;
    return typeof v.value === "string" && v.value ? { value: v.value, label: typeof v.label === "string" ? v.label : v.value } : undefined;
  } catch {
    return undefined;
  }
}

export function saveVoice(provider: string, voice: RememberedVoice | undefined) {
  try {
    if (voice?.value) window.localStorage.setItem(key(provider), JSON.stringify(voice));
    else window.localStorage.removeItem(key(provider));
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit only.
  }
}

const PROVIDER_KEY = "speak-api.provider";
const PROVIDERS = new Set(["auto", "google", "lovable", "openrouter", "gemini", "openai", "elevenlabs", "deepgram"]);

export function loadProvider(): string | undefined {
  try {
    const p = window.localStorage.getItem(PROVIDER_KEY);
    return p && PROVIDERS.has(p) ? p : undefined;
  } catch {
    return undefined;
  }
}

export function saveProvider(provider: string) {
  try {
    window.localStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    // Storage unavailable; nothing to remember.
  }
}

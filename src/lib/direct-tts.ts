// Browser-side direct calls to TTS providers (user supplies their own key).
// Speed is never sent: audio is generated at normal speed and sped up during playback.
import { speechBody } from "./fish-audio";
import { redactHeaders } from "./request-safety";

export const DIRECT_PROVIDERS = ["openai", "openrouter", "gemini", "elevenlabs", "deepgram"] as const;
export type DirectProvider = (typeof DIRECT_PROVIDERS)[number];

export function isDirectProvider(p: string): p is DirectProvider {
  return (DIRECT_PROVIDERS as readonly string[]).includes(p);
}

export type DirectInput = {
  provider: DirectProvider;
  apiKey: string;
  text: string;
  lang: string;
  voice?: string | undefined;
  options?: Record<string, unknown> | undefined;
};

const deepgramModels: Record<string, string> = {
  en: "aura-2-thalia-en",
  es: "aura-2-celeste-es",
  de: "aura-2-helena-de",
  nl: "aura-2-rhea-nl",
  fr: "aura-2-agathe-fr",
  it: "aura-2-maia-it",
  ja: "aura-2-ama-ja",
};

export function buildDirectRequest(i: DirectInput): {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  const o = i.options;
  const str = (k: string) => (typeof o?.[k] === "string" ? (o[k] as string) : undefined);
  switch (i.provider) {
    case "gemini": {
      const model = str("model") ?? "gemini-2.5-flash-preview-tts";
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        method: "POST",
        headers: { "x-goog-api-key": i.apiKey, "Content-Type": "application/json" },
        body: {
          contents: [{ parts: [{ text: `Speak naturally in ${i.lang}: ${i.text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: i.voice || "Kore" } } },
          },
        },
      };
    }
    case "openai":
      return {
        url: "https://api.openai.com/v1/audio/speech",
        method: "POST",
        headers: { Authorization: `Bearer ${i.apiKey}`, "Content-Type": "application/json" },
        body: {
          model: str("model") ?? "gpt-4o-mini-tts",
          voice: i.voice || "coral",
          input: i.text,
          response_format: "mp3",
          instructions: str("instructions") ?? `Speak naturally in ${i.lang}.`,
        },
      };
    case "openrouter":
      return {
        url: "https://openrouter.ai/api/v1/audio/speech",
        method: "POST",
        headers: { Authorization: `Bearer ${i.apiKey}`, "Content-Type": "application/json" },
        body: speechBody(i.text, i.lang, i.voice, o) as Record<string, unknown>,
      };
    case "elevenlabs": {
      const voiceId = str("voice_id") ?? (i.voice || "JBFqnCBsd6RMkjVDRZzb");
      return {
        url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        method: "POST",
        headers: { "xi-api-key": i.apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: {
          text: i.text,
          model_id: str("model") ?? "eleven_multilingual_v2",
          language_code: i.lang.toLowerCase().split("-")[0],
        },
      };
    }
    case "deepgram": {
      const model =
        str("model") ||
        i.voice ||
        deepgramModels[i.lang.toLowerCase().split("-")[0] ?? ""] ||
        "aura-2-thalia-en";
      const q = new URLSearchParams({ model });
      return {
        url: `https://api.deepgram.com/v1/speak?${q}`,
        method: "POST",
        headers: { Authorization: `Token ${i.apiKey}`, "Content-Type": "application/json" },
        body: { text: i.text },
      };
    }
  }
}

export function redactSecretHeaders(h: Record<string, string>) {
  return redactHeaders(h);
}

export function headersToObject(h: Headers) {
  const out: Record<string, string> = {};
  h.forEach((v, k) => (out[k] = v));
  return out;
}

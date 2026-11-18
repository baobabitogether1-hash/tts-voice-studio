// Browser-safe voice catalogs per provider, for the playground voice picker.
import { baseLanguage, femaleFishVoices, maleFishVoices } from "./fish-voices";

export type VoiceOption = { value: string; label: string; group?: string };

// Women's voices come first in every list: the default voice is a woman's voice.
const GEMINI_WOMEN = [
  "Zephyr", "Kore", "Leda", "Aoede", "Callirrhoe", "Autonoe", "Despina",
  "Erinome", "Laomedeia", "Alnilam", "Schedar", "Pulcherrima", "Achird",
  "Vindemiatrix", "Sadachbia", "Sulafat",
];
const GEMINI_MEN = [
  "Puck", "Charon", "Fenrir", "Orus", "Enceladus", "Iapetus", "Umbriel",
  "Algieba", "Algenib", "Rasalgethi", "Achernar", "Gacrux", "Zubenelgenubi",
  "Sadaltager",
];

const OPENAI_WOMEN = ["coral", "nova", "sage", "shimmer", "marin"];
const OPENAI_MEN = ["ash", "echo", "fable", "onyx", "verse", "cedar"];
const OPENAI_NEUTRAL = ["alloy", "ballad"];

const DEEPGRAM_WOMEN = [
  "aura-2-thalia-en", "aura-2-asteria-en", "aura-2-luna-en", "aura-2-stella-en",
  "aura-2-athena-en", "aura-2-hera-en", "aura-2-celeste-es", "aura-2-helena-de",
  "aura-2-rhea-nl", "aura-2-agathe-fr", "aura-2-maia-it", "aura-2-ama-ja",
];
const DEEPGRAM_MEN = [
  "aura-2-orion-en", "aura-2-arcas-en", "aura-2-perseus-en", "aura-2-angus-en",
  "aura-2-orpheus-en", "aura-2-helios-en", "aura-2-zeus-en",
];

const fishLanguageNames: Record<string, string> = {
  en: "English", fr: "French", it: "Italian", es: "Spanish", de: "German", pt: "Portuguese",
  ar: "Arabic", zh: "Chinese", ja: "Japanese", ko: "Korean", ru: "Russian",
  hi: "Hindi", nl: "Dutch", pl: "Polish", tr: "Turkish", he: "Hebrew",
};

/** Female voices first (the default), then male ones. */
export const FISH_VOICE_LIST: VoiceOption[] = [
  ...Object.entries(femaleFishVoices).map(([lang, v]) => ({
    value: v.id,
    label: `${v.name} (${fishLanguageNames[lang] ?? lang}, woman)`,
  })),
  ...Object.entries(maleFishVoices).map(([lang, v]) => ({
    value: v.id,
    label: `${v.name} (${fishLanguageNames[lang] ?? lang}, man)`,
  })),
];

/** The curated woman's and man's voice for one language, woman first. */
export function fishVoicesForLanguage(lang: string): VoiceOption[] {
  const base = baseLanguage(lang);
  const out: VoiceOption[] = [];
  const woman = femaleFishVoices[base];
  const man = maleFishVoices[base];
  if (woman) out.push({ value: woman.id, label: `${woman.name} (woman)` });
  if (man) out.push({ value: man.id, label: `${man.name} (man)` });
  return out;
}

const gendered = (women: string[], men: string[], neutral: string[] = []): VoiceOption[] => [
  ...women.map((v) => ({ value: v, label: `${v} (woman)` })),
  ...men.map((v) => ({ value: v, label: `${v} (man)` })),
  ...neutral.map((v) => ({ value: v, label: v })),
];

/** Selectable voices per provider, women first. ElevenLabs voices are account-specific, so it has no preset list. */
export const providerVoices: Record<string, VoiceOption[]> = {
  lovable: gendered(GEMINI_WOMEN, GEMINI_MEN),
  gemini: gendered(GEMINI_WOMEN, GEMINI_MEN),
  openai: gendered(OPENAI_WOMEN, OPENAI_MEN, OPENAI_NEUTRAL),
  deepgram: gendered(DEEPGRAM_WOMEN, DEEPGRAM_MEN),
  openrouter: FISH_VOICE_LIST,
};

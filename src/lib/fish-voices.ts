// Browser-safe Fish Audio voice catalog and name lookup (used by OpenRouter's Fish Audio models).

export type FishVoice = { id: string; name: string };

/** Default female voice per language. Fish copies the reference voice's accent, so each matches its language. */
export const femaleFishVoices: Record<string, FishVoice> = {
  en: { id: "e3cd384158934cc9a01029cd7d278634", name: "Laura" },
  fr: { id: "a288bdc744da4ad194921adad6863175", name: "Clémence" },
  it: { id: "a46b1fa8e40043049c3d86cc20f24a04", name: "Rosario" },
  es: { id: "35929683c49c4ec0bf779dc07d22620b", name: "Chica" },
  de: { id: "88b18e0d81474a0ca08e2ea6f9df5ff4", name: "Christa" },
  pt: { id: "5661bf8cb97740fcb10d2f756abf7779", name: "Isabela" },
  ar: { id: "05bf47f4aad948e1a7167a56e1d21c22", name: "حنان" },
  zh: { id: "faccba1a8ac54016bcfc02761285e67f", name: "温柔动听女声" },
  ja: { id: "0089dce5fefb4c6ba9b9f2f0debe1ddc", name: "落ち着いた女性" },
  ko: { id: "773c8796d726413bb9273821fdc1a5f9", name: "女生001" },
  ru: { id: "2a1036d645634680b3cc69aeeb60375b", name: "Спокойный женский голос" },
  hi: { id: "4d7609058bd34213b1378b29efbde1f1", name: "Girl hindi" },
  nl: { id: "96e599f345114f35bd3f40daa13be8e8", name: "Maya" },
  pl: { id: "da65d85251554e2688e0f13ddf358b85", name: "Młody Głos Polski" },
  tr: { id: "b8c121ff4fca4940bf44657f1b0d5734", name: "Canlı Türkçe Kadın Sesi" },
  he: { id: "bacebd1545c74295a5705edeb8999822", name: "Noa" },
};

/** Male voices per language, reachable with voice "male". */
export const maleFishVoices: Record<string, FishVoice> = {
  en: { id: "c5f56a6cc2ec4fa8920cb4c5889a3fb7", name: "Slax" },
  fr: { id: "fce1bed339724d91b5c9c4d01bb6e796", name: "Voix Calme et Réfléchie" },
  es: { id: "f40c5dc43e7e4e3ba641b6e8b53ad7c2", name: "Brian" },
  de: { id: "2c96d68b356b422a8c7036e75a042112", name: "Thomas" },
  pt: { id: "b5f8214552da406f801acf049ef1def4", name: "Luca" },
  ar: { id: "90265c332d894a04b9c09a91c32b6a7f", name: "shokokoOSA" },
  zh: { id: "09f2e5951ea543319af82e7d2219a92c", name: "Jimmy" },
  ja: { id: "297a6fd278df47c3b9da9bfdf55ac89a", name: "Satoru" },
  ko: { id: "1522b08ff8824100b4df795a4d149206", name: "스토리텔러" },
  ru: { id: "0e16ac9230bd4dd5b2eba5394a9379b9", name: "Профессор" },
  hi: { id: "18e8999c98b746bda58521980d817e8c", name: "Hindi narrator" },
  nl: { id: "34e7be0209bb4c848f34338687dd6c20", name: "Dean" },
  pl: { id: "ea599e3ccab045cda2b45ad8910e08fe", name: "Ciepły Męski Głos" },
  tr: { id: "8257f4d6d6334d9bb1603bfcd815e707", name: "Sakin ve Huzurlu Ses" },
};

export function baseLanguage(lang: string) {
  return lang.toLowerCase().replaceAll("_", "-").split("-")[0] ?? "";
}

export function isFishVoiceId(voice: string) {
  return /^[0-9a-f]{32}$/i.test(voice.trim());
}

/** The default (female) voice for a language, or undefined when none is known. */
export function defaultFishVoice(lang: string): string | undefined {
  return femaleFishVoices[baseLanguage(lang)]?.id;
}

const FEMALE_WORDS = new Set(["female", "woman", "women", "girl", "f"]);
const MALE_WORDS = new Set(["male", "man", "men", "boy", "m"]);

/**
 * Resolves a voice given as a Fish Audio ID, "female"/"male", a built-in voice name, or any public
 * Fish Audio voice title (searched in the Fish Audio library, best match for the language first).
 */
export async function resolveFishVoice(
  voice: string | undefined,
  lang: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | undefined> {
  const v = voice?.trim();
  const base = baseLanguage(lang);
  if (!v) return defaultFishVoice(lang);
  if (isFishVoiceId(v)) return v.toLowerCase();
  const lower = v.toLowerCase();
  if (FEMALE_WORDS.has(lower)) return defaultFishVoice(lang);
  if (MALE_WORDS.has(lower)) return maleFishVoices[base]?.id;
  const builtIn = [...Object.values(femaleFishVoices), ...Object.values(maleFishVoices)].find(
    (x) => x.name.toLowerCase() === lower,
  );
  if (builtIn) return builtIn.id;
  const search = async (withLanguage: boolean) => {
    const q = new URLSearchParams({ title: v, page_size: "20", sort_by: "task_count" });
    if (withLanguage && base) q.set("language", base);
    const res = await fetchImpl(`https://api.fish.audio/model?${q}`);
    if (!res.ok) throw new Error(`Fish Audio voice search failed (${res.status})`);
    const data = (await res.json()) as { items?: Array<{ _id: string; title?: string; type?: string }> };
    const items = (data.items ?? []).filter((m) => !m.type || m.type === "tts");
    return items.find((m) => m.title?.trim().toLowerCase() === lower) ?? items[0];
  };
  const found = (await search(true)) ?? (await search(false));
  if (!found) throw new FishVoiceNotFound(v);
  return found._id;
}

export class FishVoiceNotFound extends Error {
  constructor(name: string) {
    super(`No Fish Audio voice named "${name}". Use a voice name from fish.audio or its 32-character ID.`);
    this.name = "FishVoiceNotFound";
  }
}

export type FishVoiceOption = { value: string; label: string; gender?: "woman" | "man" };

/** Popular public Fish Audio voices for a language, women first, then men. */
export async function listFishVoices(lang: string, fetchImpl: typeof fetch = fetch): Promise<FishVoiceOption[]> {
  const base = baseLanguage(lang);
  const fetchTag = async (tag: "female" | "male") => {
    const q = new URLSearchParams({ tag, page_size: "15", sort_by: "task_count" });
    if (base) q.set("language", base);
    const res = await fetchImpl(`https://api.fish.audio/model?${q}`);
    if (!res.ok) throw new Error(`Fish Audio voice list failed (${res.status})`);
    const data = (await res.json()) as { items?: Array<{ _id: string; title?: string; type?: string }> };
    return (data.items ?? [])
      .filter((m) => isFishVoiceId(m._id) && (!m.type || m.type === "tts"))
      .map((m): FishVoiceOption => ({
        value: m._id,
        label: (m.title?.trim() || m._id).slice(0, 60),
        gender: tag === "female" ? "woman" : "man",
      }));
  };
  const [women, men] = await Promise.all([fetchTag("female"), fetchTag("male")]);
  const seen = new Set<string>();
  return [...women, ...men].filter((v) => !seen.has(v.value) && seen.add(v.value));
}

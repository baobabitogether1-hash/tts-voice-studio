import { beforeEach, describe, expect, it } from "vitest";
import { loadProvider, loadVoice, saveProvider, saveVoice } from "@/lib/voice-memory";

describe("remembered voice choice", () => {
  beforeEach(() => window.localStorage.clear());
  it("remembers the chosen voice per provider", () => {
    saveVoice("openrouter", { value: "e3cd384158934cc9a01029cd7d278634", label: "Laura" });
    saveVoice("openai", { value: "nova", label: "nova" });
    expect(loadVoice("openrouter")).toEqual({ value: "e3cd384158934cc9a01029cd7d278634", label: "Laura" });
    expect(loadVoice("openai")?.value).toBe("nova");
  });
  it("forgets the voice when the default is picked again", () => {
    saveVoice("openrouter", { value: "x", label: "x" });
    saveVoice("openrouter", undefined);
    expect(loadVoice("openrouter")).toBeUndefined();
  });
  it("remembers the last provider and ignores unknown ones", () => {
    saveProvider("openrouter");
    expect(loadProvider()).toBe("openrouter");
    saveProvider("nope");
    expect(loadProvider()).toBeUndefined();
  });
});

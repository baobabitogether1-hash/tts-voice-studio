import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession, onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
}));

const { applyPlaybackRate, clampPlaybackRate, loadAccessToken, saveAccessToken, ttsRequestHeaders } =
  await import("@/lib/tts-client");

describe("playground TTS requests", () => {
  beforeEach(() => {
    getSession.mockReset();
    window.localStorage.clear();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "pk");
  });

  it("sends the saved access token without needing a Supabase session or per-request api_key", async () => {
    saveAccessToken(" spt_test-token ");
    expect(loadAccessToken()).toBe("spt_test-token");
    expect((await ttsRequestHeaders()).get("Authorization")).toBe("Bearer spt_test-token");
    expect(getSession).not.toHaveBeenCalled();
  });

  it("uses an explicit access token override when provided", async () => {
    expect((await ttsRequestHeaders("spk_override")).get("Authorization")).toBe(
      "Bearer spk_override",
    );
  });

  it("sends the signed-in user's access token so saved provider keys are used", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "user-jwt" } }, error: null });
    expect((await ttsRequestHeaders()).get("Authorization")).toBe("Bearer user-jwt");
  });

  it("sends no Authorization header when signed out and no access token is stored", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect((await ttsRequestHeaders()).get("Authorization")).toBeNull();
  });
});

describe("client-side playback speed", () => {
  it("supports 0.25x to 4x", () => {
    expect(clampPlaybackRate(0.1)).toBe(0.25);
    expect(clampPlaybackRate(2.5)).toBe(2.5);
    expect(clampPlaybackRate(6)).toBe(4);
  });

  it("changes playback rate while keeping pitch", () => {
    const audio = document.createElement("audio");
    applyPlaybackRate(audio, 1.75);
    expect(audio.playbackRate).toBe(1.75);
    expect(audio.defaultPlaybackRate).toBe(1.75);
    expect(audio.preservesPitch).toBe(true);
  });
});

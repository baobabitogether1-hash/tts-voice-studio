import { describe, expect, it, vi } from 'vitest';
import { speechBody, speechLanguages } from '@/lib/fish-audio';
import { FishVoiceNotFound, resolveFishVoice } from '@/lib/fish-voices';
import { buildDirectRequest } from '@/lib/direct-tts';
import { detectLanguageCode } from '@/lib/language-detection';

const LAURA = 'e3cd384158934cc9a01029cd7d278634';

describe('Fish Audio multilingual requests', () => {
  it('keeps Hebrew text and language in the free model request', () => {
    const body = speechBody('שלום, מה שלומך?', 'he');
    expect(body).toMatchObject({ model: 'fish-audio/s2.1-pro-free:free', input: 'שלום, מה שלומך?', language: 'he' });
  });
  it('uses the translated language rather than an options override', () => {
    expect(speechBody('Bonjour', 'fr', undefined, { language: 'en' })).toMatchObject({ input: 'Bonjour', language: 'fr' });
  });
  it('defaults to a female voice in the requested language and preserves explicit voices', () => {
    expect(speechBody('Hello', 'en').voice).toBe(LAURA);
    expect(speechBody('Bonjour', 'fr-FR').voice).toBe('a288bdc744da4ad194921adad6863175');
    expect(speechBody('שלום', 'he').voice).toBe('bacebd1545c74295a5705edeb8999822');
    expect(speechBody('Ciao', 'it', 'custom-voice').voice).toBe('custom-voice');
  });
  it('never sends speed, even when options include it', () => {
    expect(speechBody('Hello', 'en', undefined, { speed: 2 })).not.toHaveProperty('speed');
    for (const provider of ['openai', 'openrouter', 'elevenlabs', 'deepgram', 'gemini'] as const) {
      const req = buildDirectRequest({ provider, apiKey: 'k', text: 'Hi', lang: 'en', options: { speed: 2 } });
      expect(req.body).not.toHaveProperty('speed');
      expect(req.body).not.toHaveProperty('voice_settings');
      expect(new URL(req.url).searchParams.has('speed')).toBe(false);
    }
  });
  it('offers YouTube caption codes and passes regional language tags through', () => {
    expect(speechLanguages).toContainEqual(['zh-Hant', 'Chinese (Traditional)']);
    expect(speechLanguages).toContainEqual(['es-419', 'Spanish (Latin America)']);
    expect(speechBody('Xin chao', 'vi').language).toBe('vi');
  });
  it('detects common languages locally and waits for enough text', () => {
    expect(detectLanguageCode('Bonjour, comment allez-vous aujourd’hui ? La lumière du soir est magnifique.')).toBe('fr');
    expect(detectLanguageCode('Ciao, come stai oggi? La luce della sera è bellissima.')).toBe('it');
    expect(detectLanguageCode('שלום, מה שלומך היום?')).toBe('he');
    expect(detectLanguageCode('你好，今天过得怎么样？')).toBe('zh');
    expect(detectLanguageCode('مرحباً، كيف حالك اليوم؟ أحب أن أتعلم لغات جديدة.')).toBe('ar');
    expect(detectLanguageCode('سلام، من امروز می‌خواهم درباره زبان‌های جدید یاد بگیرم.')).toBe('fa');
    expect(detectLanguageCode('Hello')).toBeUndefined();
  });
});

describe('Fish Audio voice names', () => {
  const noFetch = vi.fn(async () => { throw new Error('should not search'); }) as unknown as typeof fetch;
  it('uses a woman voice by default and for "female"', async () => {
    expect(await resolveFishVoice(undefined, 'en', noFetch)).toBe(LAURA);
    expect(await resolveFishVoice('female', 'en-US', noFetch)).toBe(LAURA);
  });
  it('resolves built-in names and IDs without searching', async () => {
    expect(await resolveFishVoice('laura', 'fr', noFetch)).toBe(LAURA);
    expect(await resolveFishVoice('ABCDEF0123456789ABCDEF0123456789', 'en', noFetch)).toBe('abcdef0123456789abcdef0123456789');
  });
  it('looks other names up in the Fish Audio library, preferring an exact title', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toContain('title=Sarah');
      return Response.json({ items: [{ _id: 'a'.repeat(32), title: 'Sarah fan' }, { _id: 'b'.repeat(32), title: 'Sarah' }] });
    });
    expect(await resolveFishVoice('Sarah', 'en', fetchMock as unknown as typeof fetch)).toBe('b'.repeat(32));
  });
  it('reports a missing voice name', async () => {
    const empty = vi.fn(async () => Response.json({ items: [] })) as unknown as typeof fetch;
    await expect(resolveFishVoice('Nobody', 'en', empty)).rejects.toBeInstanceOf(FishVoiceNotFound);
  });
});

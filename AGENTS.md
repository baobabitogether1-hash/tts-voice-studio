<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Use shared browser-safe request-safety helpers for credential redaction and JSON-object checks so client and server logs apply the same safeguards.
- Decode Gemini direct-response PCM to a WAV Blob in the browser-safe audio helper; the provider returns JSON rather than a playable audio response.
- Treat an explicit TTS providers list as ordered fallback, with provider-scoped options overriding common options; this keeps requests within the caller's chosen services.
- Send browser TTS requests through the shared tts-client helper (session bearer + playback-rate control); speed is playback-only everywhere — the API accepts `speed` for old callers but provider requests never carry it, keeping pitch natural.
- Keep Fish Audio voice defaults, name lookup and live voice listing in the browser-safe fish-voices module, and remembered voice/provider choices in voice-memory (localStorage), so server, direct mode and the picker resolve voices the same way.

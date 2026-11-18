# Immediate fixes

- [x] Repair direct-provider controls and Gemini audio handling.
- [x] Fix confirmed request validation and credential-redaction weaknesses.
- [x] Verify regression tests and the speech flow in the browser (real Google audio; Gemini response simulated without a provider key).

# Request customization
- [x] Add ordered provider choices and per-provider settings.
- [x] Expand debug metadata and document anonymous Google requests.
- [x] Verify endpoint rules and browser requests (35 tests; real anonymous Google GET and POST).
# Voices
- [x] Default OpenRouter Fish Audio to a woman's voice per language.
- [x] Never send speed to any voice service.
- [x] List optional voices to pick from and remember the chosen voice.
- [ ] Verify real OpenRouter audio for Italian, Dutch and Hebrew voices (blocked: OpenRouter free-tier rate limit).

# Test report

## Slice 1 — CI run 2026-11-11: PASSED

GitHub Actions run https://github.com/samiribrahimhasso1985/Hasso/actions/runs/43033139379 — `testDebugUnitTest` passed (28 tests in 8 suites, 0 failures) and `assembleDebug` produced the debug APK.

Unit tests (JVM) in `app/src/test`:

| Suite | Covers |
| --- | --- |
| EpisodeNumberingTest | forward-only counters, draft format, per-series official counter, 11 statuses, 5000 episodes without limit |
| ReadingTimeTest | word count, Arabic / English estimates |
| SceneSegmenterTest | paragraphs, `#` headings, auto titles, whitespace-insensitive hashes, empty script |
| SceneSyncPlannerTest | keep unchanged, approved+changed → NEEDS_REVIEW, reorder, removed → flagged not deleted, insert |
| UndoRedoBufferTest | round trip, capacity bound, duplicate push |
| BackgroundCategoryTest | parsing provider spellings |
| AiJsonTest | JSON in code fences, bare JSON, invalid JSON returns null, merge without duplicates |
| AIErrorHandlerTest | retries 429, does not retry 401 |

Not yet tested: device tests (voice, Keystore, RTL layout on the tablet) are not run yet.

## Slice 2 — CI run 43043806683 (commit 95542aa): passed

- 44 unit tests (16 new): licence checker, workflow unlock rules, missing-take check, SRT/VTT/MD import cleaning,
  Wikimedia Commons response parsing and licence-first picking, and a schema test that compares the v1 → v2
  migration SQL with the schema Room exported during the build (also checks that the `lens` column is gone).
- APK: `AIDirectorFX3-slice2.apk` in release `ai-director-fx3-build-3`.
- Not yet verified on a real device: the database upgrade from slice 1, Wikimedia downloads, AI image generation
  with a real key, file import/export pickers, RTL layout of the wizard.

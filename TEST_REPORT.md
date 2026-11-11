# Test report

## Slice 1 — pending first CI run

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

Results will be filled in from the GitHub Actions run. Device tests (voice, Keystore, RTL layout on the tablet) are not run yet.

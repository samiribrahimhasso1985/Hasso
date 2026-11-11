# AI API setup

A ChatGPT Plus or Claude Pro subscription does **not** include API access. Each provider needs its own API key and billing.

| Provider | Where to get a key | Model id |
| --- | --- | --- |
| Anthropic Claude | console.anthropic.com → API Keys | pick from "Pick from available models" after testing |
| OpenAI | platform.openai.com → API keys | same |
| Google Gemini | aistudio.google.com → Get API key | same |

## In the app

1. Open **AI Control Center**.
2. Paste the key and tap **Save**. It is encrypted with Android Keystore and never shown again.
3. Tap **Test connection**. This calls the provider's official models endpoint and lists available models.
4. Pick a model, then switch **Enabled** on.
5. Choose **Single model** (cheapest) or **Compare all enabled** (same request to every enabled provider; cost multiplies).

Keys are never stored in source code or in the APK, and are never written to logs.

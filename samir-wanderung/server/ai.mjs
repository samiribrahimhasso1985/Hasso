// AI hiking assistant. The model only proposes a trip plan as structured data;
// the frontend then verifies every proposed route with the real routing engine.
import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './lib.mjs';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
let client = null;
const configured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'intent', 'plan', 'packing'],
  properties: {
    reply: { type: 'string', description: 'Short answer to the user in their language.' },
    intent: { type: 'string', enum: ['plan_trip', 'discover', 'question', 'other'] },
    plan: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['startQuery', 'destinationQuery', 'stopQueries', 'routeType', 'roundTrip', 'targetHours', 'suggestedStops'],
      properties: {
        startQuery: { type: ['string', 'null'], description: 'Geocodable place name for the start, or null to use the user location.' },
        destinationQuery: { type: 'string', description: 'Geocodable real place name (peak, lake, hut, village).' },
        stopQueries: { type: 'array', items: { type: 'string' } },
        routeType: { type: 'string', enum: ['standard', 'shortest', 'easier', 'mountain'] },
        roundTrip: { type: 'boolean' },
        targetHours: { type: ['number', 'null'] },
        suggestedStops: { type: 'array', items: { type: 'string' } },
      },
    },
    packing: { type: 'array', items: { type: 'string' }, description: 'General preparation advice items.' },
  },
};

const SYSTEM = `You are the hiking assistant of SSBN, a 3D hiking app.
Reply in the user's language (Arabic, German, English or Kurdish).
When the user wants a hike, produce a plan with REAL, geocodable place names (well-known peaks, lakes, huts, villages). Never invent places.
You do not compute routes, distances, durations or elevation yourself: the app verifies the plan with the Valhalla routing engine and computes those numbers. Do not state distances or times as facts; you may say what you are aiming for.
Never claim a trail is open, safe or that the weather is good. Mention that conditions must be checked locally.
Difficulty you mention is an estimate, not an official rating.
The packing list is general preparation advice, adapted to season, duration and terrain when known.
If you are unsure where the user is, ask, or set startQuery to null (the app then uses GPS with permission).`;

export async function chat({ messages, context }) {
  if (!configured()) throw new HttpError(503, 'ai_not_configured');
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) throw new HttpError(400, 'invalid_messages');
  const clean = messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '').slice(0, 4000) }));
  if (clean[0].role !== 'user') throw new HttpError(400, 'invalid_messages');
  client ??= new Anthropic();
  const ctx = context && typeof context === 'object'
    ? `App context: language=${String(context.lang ?? 'en').slice(0, 5)}; date=${new Date().toISOString().slice(0, 10)}; ${context.near ? `approximate area the user is viewing: ${String(context.near).slice(0, 120)}` : 'user area unknown'}.`
    : '';
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM + (ctx ? `\n${ctx}` : ''),
      messages: clean,
    });
    if (res.stop_reason === 'refusal') throw new HttpError(422, 'ai_refused');
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new HttpError(502, 'ai_bad_output'); }
    return { model: res.model, ...parsed };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'ai_rate_limited');
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(503, 'ai_auth_failed');
    if (e instanceof Anthropic.APIError) throw new HttpError(502, 'ai_error', { status: e.status });
    throw new HttpError(503, 'ai_unavailable');
  }
}

export const aiStatus = () => ({ configured: configured(), model: MODEL });

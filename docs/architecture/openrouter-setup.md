# Connect the free OpenRouter chat

The project owner explicitly authorized sending submitted messages and recent history to OpenRouter and its model provider on 27 October 2026. Each user sees the destination disclosure before Send. This authorizes the integration, not spending or buying credits.

## Get a free key

1. Sign up or sign in at https://openrouter.ai/keys.
2. Create a key named `QaamuusAI free pilot`. Store the revealed value privately. Review the key's limits and expiry; do not enable auto top-ups or buy credits for this pilot.
3. Locally, edit ignored `apps/web/.env.local` and put the key after `OPENROUTER_API_KEY=`. Never use a `NEXT_PUBLIC_` variable. Save and restart `pnpm dev`.
4. In Vercel's `qaamuus-ai` project, add the same server-only variable under Settings → Environment Variables for the intended environment, then redeploy. Local setup does not update Vercel and Vercel setup does not update the local server.
5. Open the chat, choose Free AI chat and try a short question, followed by a differently phrased follow-up. The status checks only whether the server has a key; actual key validity and provider availability are established by a successful live answer. Never paste the key into chat, a screenshot, source control or a public support message.

[Official authentication instructions](https://openrouter.ai/docs/api-reference/authentication).

## Free-only request controls

The server fixes the model to `nvidia/nemotron-3.5-lightning:free`, uses the fixed OpenRouter chat-completions URL, and sends `provider.max_price` with prompt, completion and request all zero. It disables provider fallbacks and uses only the approved NVIDIA provider with `data_collection: allow`. No tools, paid model list, image/audio input, auto credits or automatic retries are configured. If no eligible free provider exists, return an error; never silently change the model or remove privacy/price filters.

OpenRouter's no-purchase free tier currently lists 50 requests/day shared by the whole account. Availability and limits can change. The app has an additional per-process backstop of 40 attempts/UTC day and 5/minute per trusted network identifier (shared on other hosts). That backstop is not a distributed quota: serverless instances may reset or run separately, and the provider is authoritative for account limits. Configure hosting edge limits before broad public use. Failed/aborted attempts consume local allowance, and provider accounting is separate. There is no claim of a live remaining-request counter.

Only text history is accepted: up to seven alternating user/assistant messages, 2,000 characters/user message, 6,000/assistant message, 18,000 total content characters, 32 KB request body and 1,024 generated tokens. Output is rendered as plain text. Model/settings/system prompts cannot be selected by the browser. Recent assistant text is untrusted and confers no account authority. All context is curated public project information, not applicant records or private drafts. Prompts and key values are not logged by application code.

The account/model privacy rules can affect free endpoint availability. Review the actual account settings and [provider policies](https://openrouter.ai/docs/guides/privacy/provider-logging). Somali quality remains unverified; do not describe multilingual support as a Somali benchmark result.

## Validation and operating limits

Mocked tests cover paraphrases/follow-ups, server configuration, key secrecy, quota errors, free-price routing, unsafe payloads, errors/timeouts and local-guide fallback. These tests do not establish a successful live inference or evaluate model quality. A real key and a successful live test are still needed. Test expiry, quota exhaustion and provider availability in the intended deployment before telling users the chat is operational. Stop signals cancellation but cannot promise that an already processed provider request is undone.

Sources checked 27 October 2026: [model](https://openrouter.ai/google/gemma-4-31b-it:free), [pricing](https://openrouter.ai/pricing), [routing controls](https://openrouter.ai/docs/guides/routing/provider-selection), [quickstart](https://openrouter.ai/docs/quickstart).

## Endpoint verification

On 27 October 2026 the public OpenRouter endpoints API returned no serving endpoints for the earlier Llama free candidate. The integration was changed to `google/gemma-4-31b-it:free`, whose public endpoint metadata lists a zero-price Google AI Studio endpoint. Pricing/privacy filters remain mandatory; successful inference still needs a live test.

## Live connection check — 27 October 2026

The owner added a key privately. An authenticated key-status check succeeded and identified a free-tier account. The original Llama free endpoint had no serving providers. Both checked Gemma free variants returned an upstream temporary capacity/rate-limit error for short non-sensitive test questions; this was not a successful inference. An NVIDIA free candidate was excluded by the account/data-policy restrictions; those restrictions were not relaxed. The selected integration remains Gemma 4 31B with zero-price/private-provider filters and no paid fallback. A successful real answer remains unverified until provider capacity returns. No key or account identifiers are recorded in this document.

## NVIDIA trial — owner-approved 27 October 2026

The owner explicitly approved NVIDIA’s disclosed recording and product-improvement use after Gemma returned upstream capacity errors. The server now selects only `nvidia/nemotron-3.5-lightning:free` with the NVIDIA provider allowlist, `data_collection: allow`, zero maximum prompt/completion/request prices, and no paid fallback. Local activation is gated by `OPENROUTER_ALLOW_NVIDIA_DATA_USE=true`; a deployment needs the same explicit setting. Every visitor must also acknowledge the provider disclosure before sending; the server rejects requests without that acknowledgement. This approval does not permit confidential or personal data submission.

OpenRouter account settings can independently block free-model training/data use. If a live request returns `provider_privacy_settings`, the account owner must review https://openrouter.ai/settings/privacy and enable the relevant free-model option themselves. No paid-model privacy setting or billing purchase is needed.

## Successful live test

On 27 October 2026, after the owner approved NVIDIA data use and local activation, the actual application endpoint returned HTTP 200 with a real NVIDIA Nemotron 3.5 Lightning answer describing the project mission. The request used a non-sensitive synthetic project question and retained all zero-price limits. This confirms a working connection at that time, not guaranteed future capacity, a full quality evaluation or production deployment. Visitor acknowledgement remains mandatory.

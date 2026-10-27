# Free AI pilot candidate

Researched 27 October 2026. Provider connection is not implemented or activated. The chat interface is a draft-only preview and transmits no conversations. No API keys were obtained and no paid accounts were created.

## Proposed model

[Meta Llama 3.3 70B Instruct free endpoint](https://openrouter.ai/meta-llama/llama-3.3-70b-instruct:free), model ID `meta-llama/llama-3.3-70b-instruct:free`. OpenRouter currently lists zero input/output inference pricing. This is a candidate for a small general chat/coding/writing pilot, not a measured quality claim. Somali is not among the officially listed supported languages; independently review Somali prompts before release.

[OpenRouter pricing](https://openrouter.ai/pricing) lists 50 free-model requests per day for an account without qualifying credit purchases and 20 requests per minute. The allowance is shared across the application's users when using one provider account, not fifty requests per visitor. Limits and free endpoint availability can change. Failed attempts can consume allowance. Do not purchase credits merely to increase a free pilot quota. Hosting remains a separate expense.

## User-facing limitation

“Free AI pilot. Replies may be limited or temporarily unavailable. Answers can contain mistakes, and Somali quality has not been independently verified.” Until connected, explicitly label the interface as connection pending and keep Send disabled; do not simulate model answers.

## Requirements before activation

- Obtain explicit authorization for sending user messages and recent conversation history to OpenRouter and its selected inference provider. The previous OpenAI connection was not authorized; it must not be enabled implicitly.
- Configure a server-only free-account API key. Never expose it to the browser or commit it.
- Pin the free model endpoint. Do not use automatic paid-model fallback, auto-credit purchases or a general paid model router. Verify selected endpoint pricing before activation; fail closed if the free endpoint is unavailable.
- Add sign-in and shared, persistent quotas below the provider allowance, bounded history and response lengths, and a friendly allowance-exhausted state. Account limits should be verified without transmitting a user prompt.
- Review [provider retention/training policies](https://openrouter.ai/docs/guides/privacy/provider-logging), configure acceptable routing, and disclose the actual providers in the privacy notice before sending anything. Free does not imply private or zero retention.
- Test representative Somali, English and coding tasks with independent review. Do not promise unrestricted capability, live web access, voice or file uploads.

The current code only adds the interface and limitation notice. It does not enforce external quotas or connect this endpoint yet.

<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use Anthropic\Client as SdkClient;
use Anthropic\RequestOptions;
use App\Models\Organization;

/**
 * Resolves per-organization AnthropicClientInterface instances (BYOK).
 *
 * NOT `final` — tests or observability providers may subclass if needed.
 * The preferred mocking path is to override $app->instance(AnthropicClientInterface::class).
 */
class AnthropicClientFactory
{
    /**
     * Resolve a client scoped to a single organization's API key (BYOK).
     *
     * Aborts 402 (Payment Required) if the org has no key — callers that want graceful
     * degradation should call Organization::hasAnthropicKey() first and render the
     * "configure sua chave" UX instead of invoking this method.
     */
    public function forOrganization(Organization $org): AnthropicClientInterface
    {
        $key = $org->anthropic_api_key; // decrypted via Laravel 'encrypted' cast
        abort_if(empty($key), 402, 'No Anthropic API key configured for this organization.');

        $sdk = new SdkClient(
            apiKey: $key,
            requestOptions: RequestOptions::with(maxRetries: 2, timeout: 120),
        );

        return new AnthropicClient($sdk);
    }

    /**
     * Dev/test fallback — uses config('services.anthropic.api_key_fallback') from .env.
     * Production code paths must use forOrganization().
     */
    public function forTesting(): AnthropicClientInterface
    {
        $sdk = new SdkClient(
            apiKey: (string) config('services.anthropic.api_key_fallback'),
            requestOptions: RequestOptions::with(maxRetries: 2, timeout: 120),
        );

        return new AnthropicClient($sdk);
    }
}

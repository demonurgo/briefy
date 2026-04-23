<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use Anthropic\Client as SdkClient;

/**
 * Concrete Anthropic client. Thin delegator to the SDK.
 *
 * NOT `final` — intentionally overridable for observability decorators (e.g.,
 * a logging wrapper in Plan 13). Tests should NOT subclass this; bind a fake
 * AnthropicClientInterface instead.
 */
class AnthropicClient implements AnthropicClientInterface
{
    public function __construct(private SdkClient $sdk) {}

    public function messages(): object
    {
        return $this->sdk->messages;
    }

    public function beta(): object
    {
        // Older SDK versions may not expose ->beta. Fall back to an empty stdClass
        // so downstream code (which uses Laravel's Http facade for MA anyway) doesn't NPE.
        return property_exists($this->sdk, 'beta') ? $this->sdk->beta : new \stdClass;
    }
}

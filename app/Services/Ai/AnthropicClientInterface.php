<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

/**
 * Thin contract over the surface of Anthropic\Client that Briefy actually uses.
 *
 * Exists so test doubles can implement this interface and be bound via
 * $this->app->instance(AnthropicClientInterface::class, $fake) — rather than
 * attempting to subclass the (final) AnthropicClient or the SDK's Client class.
 */
interface AnthropicClientInterface
{
    /** Returns the Messages resource (createStream, create, etc.). */
    public function messages(): object;

    /** Returns the SDK's beta namespace (for managed-agents beta endpoints if exposed). */
    public function beta(): object;
}

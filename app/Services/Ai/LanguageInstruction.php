<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use Illuminate\Support\Facades\Auth;

class LanguageInstruction
{
    private static array $map = [
        'pt-BR' => 'Always respond in Brazilian Portuguese (pt-BR).',
        'en'    => 'Always respond in English.',
        'es'    => 'Always respond in Spanish.',
    ];

    /**
     * Returns a language instruction line based on the authenticated user's locale.
     * Falls back to pt-BR if no user or unknown locale.
     */
    public static function forCurrentUser(): string
    {
        /** @var \App\Models\User|null $user */
        $user   = Auth::user();
        $locale = $user?->locale() ?? 'pt-BR';

        return self::$map[$locale] ?? self::$map['pt-BR'];
    }

    /**
     * Appends the language instruction to an existing system prompt.
     */
    public static function append(string $system): string
    {
        return $system . "\n\n" . self::forCurrentUser();
    }
}

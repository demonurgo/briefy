<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai\Schemas;

use Illuminate\Validation\Rule;

final class MonthlyPlanSchema
{
    public const CHANNELS = ['instagram', 'linkedin', 'facebook', 'tiktok', 'blog', 'email', 'other'];

    /** JSON schema passed as Anthropic tool input_schema. */
    public static function toolSchema(int $expectedCount): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'items' => [
                    'type' => 'array',
                    'minItems' => $expectedCount,
                    'maxItems' => $expectedCount,
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'date'        => ['type' => 'string', 'format' => 'date'],
                            'title'       => ['type' => 'string', 'minLength' => 3, 'maxLength' => 140],
                            'description' => ['type' => 'string', 'minLength' => 10, 'maxLength' => 600],
                            'channel'     => ['type' => 'string', 'enum' => self::CHANNELS],
                        ],
                        'required' => ['date', 'title', 'description', 'channel'],
                    ],
                ],
            ],
            'required' => ['items'],
        ];
    }

    /** Laravel validator rules — second defensive gate. */
    public static function rules(int $expectedCount): array
    {
        return [
            'items'               => ['required', 'array', "size:{$expectedCount}"],
            'items.*.date'        => ['required', 'date'],
            'items.*.title'       => ['required', 'string', 'min:3', 'max:140'],
            'items.*.description' => ['required', 'string', 'min:10', 'max:600'],
            'items.*.channel'     => ['required', Rule::in(self::CHANNELS)],
        ];
    }
}

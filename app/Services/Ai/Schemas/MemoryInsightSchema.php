<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai\Schemas;

final class MemoryInsightSchema
{
    public const CATEGORIES = ['tone', 'patterns', 'preferences', 'avoid', 'terminology'];
    public const MIN_CONFIDENCE_AUTO_APPLY = 0.6;

    public static function toolSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'insights' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'category'   => ['type' => 'string', 'enum' => self::CATEGORIES],
                            'insight'    => ['type' => 'string', 'maxLength' => 280],
                            'confidence' => ['type' => 'number', 'minimum' => 0, 'maximum' => 1],
                        ],
                        'required' => ['category', 'insight', 'confidence'],
                    ],
                ],
            ],
            'required' => ['insights'],
        ];
    }

    /**
     * Laravel validation rules for a single insight item.
     * Used in tests and any place that validates tool output manually.
     */
    public static function validationRules(): array
    {
        return [
            'insights'              => ['required', 'array'],
            'insights.*.category'   => ['required', 'string', 'in:' . implode(',', self::CATEGORIES)],
            'insights.*.insight'    => ['required', 'string', 'max:280'],
            'insights.*.confidence' => ['required', 'numeric', 'min:0', 'max:1'],
        ];
    }
}

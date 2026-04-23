<?php
// (c) 2026 Briefy contributors — AGPL-3.0

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'anthropic' => [
        'api_key_fallback' => env('ANTHROPIC_API_KEY'),           // dev/test only — NOT used in production paths
        'beta_ma'          => 'managed-agents-2026-04-01',
        'model_complex'    => env('ANTHROPIC_MODEL_COMPLEX', 'claude-opus-4-7'),
        'model_chat'       => env('ANTHROPIC_MODEL_CHAT',    'claude-sonnet-4-6'),
        'model_cheap'      => env('ANTHROPIC_MODEL_CHEAP',   'claude-haiku-4-5'),
    ],

    'otel' => [
        'enabled'      => env('OTEL_EXPORTER_OTLP_ENDPOINT') !== null && extension_loaded('curl'),
        'endpoint'     => env('OTEL_EXPORTER_OTLP_ENDPOINT'),
        'service_name' => env('OTEL_SERVICE_NAME', 'briefy-ai'),
    ],

];

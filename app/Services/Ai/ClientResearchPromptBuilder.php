<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Client;

final class ClientResearchPromptBuilder
{
    public function system(): string
    {
        return file_get_contents(resource_path('prompts/client_research_system.md'));
    }

    public function userMessage(Client $client): string
    {
        $handles = $client->social_handles ?? [];
        $lines = ["Research the following brand-client:", "Name: {$client->name}"];
        if (! empty($client->segment)) $lines[] = "Segment: {$client->segment}";
        if (! empty($handles['website']))   $lines[] = "Website: {$handles['website']}";
        if (! empty($handles['instagram'])) $lines[] = "Instagram: {$handles['instagram']}";
        if (! empty($handles['linkedin']))  $lines[] = "LinkedIn: {$handles['linkedin']}";
        if (! empty($handles['facebook']))  $lines[] = "Facebook: {$handles['facebook']}";
        if (! empty($handles['tiktok']))    $lines[] = "TikTok: {$handles['tiktok']}";

        $lines[] = '';
        $lines[] = 'Begin the research. When you have 10-15 high-confidence insights, call record_insights with the full array and stop.';

        return implode("\n", $lines);
    }
}

<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Demand;

final class ChatPromptBuilder
{
    /**
     * Build system blocks for the chat. First block is cached (stable per demand/client);
     * second block carries the volatile comments tail (last 20) outside the cache.
     *
     * @return array<int, array{type: string, text: string, cache_control?: array}>
     */
    public function chatSystem(Demand $demand): array
    {
        $client  = $demand->client;
        $files   = $demand->files->map(fn ($f) => "- {$f->name} ({$f->type})")->implode("\n") ?: '_(nenhum)_';
        $memory  = $client->aiMemory()->orderBy('category')->get()
                       ->map(fn ($m) => "- [{$m->category}] (confidence={$m->confidence}) {$m->insight}")
                       ->implode("\n") ?: '_(sem memória durável ainda)_';
        $template = file_get_contents(resource_path('prompts/chat_system.md'));

        $stablePrefix = <<<PROMPT
        {$template}

        ## Client: {$client->name}

        Tone, patterns, preferences (`client_ai_memory`):
        {$memory}

        ## Demand

        - Title: {$demand->title}
        - Objective: {$demand->objective}
        - Channel: {$demand->channel}
        - Tone declared: {$demand->tone}
        - Deadline: {$demand->deadline}

        Description:
        {$demand->description}

        ## Files attached

        {$files}
        PROMPT;

        // Volatile tail — comments tail. Loaded separately, outside cache_control.
        $comments = $demand->comments()
            ->with('user')
            ->latest()
            ->take(20)
            ->get()
            ->reverse()
            ->map(fn ($c) => "[{$c->created_at}] {$c->user?->name}: {$c->body}")
            ->implode("\n") ?: '_(sem comentários)_';

        return [
            [
                'type'          => 'text',
                'text'          => $stablePrefix,
                'cache_control' => ['type' => 'ephemeral'],
            ],
            [
                'type' => 'text',
                'text' => "## Last 20 comments on this demand\n\n{$comments}",
            ],
        ];
    }
}

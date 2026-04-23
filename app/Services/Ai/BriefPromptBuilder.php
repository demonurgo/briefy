<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Demand;

final class BriefPromptBuilder
{
    /**
     * Build the (system, user) pair for brief generation.
     *
     * @return array{0: array<int, array{type: string, text: string, cache_control?: array}>, 1: string}
     *         [0] = system blocks (first block with cache_control for stable prefix)
     *         [1] = user message
     */
    public function build(Demand $demand): array
    {
        $client = $demand->client;
        $memoryRows = $client->aiMemory()
            ->orderBy('category')
            ->get();
        $memory = $memoryRows
            ->map(fn ($m) => "- [{$m->category}] (confidence={$m->confidence}) {$m->insight}")
            ->implode("\n");
        if (empty($memory)) {
            $memory = '_(nenhuma memória durável ainda — use tom neutro, profissional, evite marketing-speak)_';
        }

        $template = file_get_contents(resource_path('prompts/brief_system.md'));
        $systemText = strtr($template, [
            '{{client_name}}'   => $client->name,
            '{{client_memory}}' => $memory,
        ]);

        $deadlineIso = $demand->deadline ? (string) $demand->deadline : '(sem prazo definido)';

        $userMessage = <<<USR
        Gere o brief para a demanda abaixo. Siga exatamente as 9 seções declaradas nas regras do sistema, nessa ordem.

        ## Demanda
        Título: {$demand->title}
        Objetivo declarado: {$demand->objective}
        Canal: {$demand->channel}
        Tom declarado: {$demand->tone}
        Prazo da demanda: {$deadlineIso}

        Descrição:
        {$demand->description}
        USR;

        return [
            [
                [
                    'type' => 'text',
                    'text' => $systemText,
                    // Cache the stable prefix (client memory + rules). TTL 5 min.
                    // Note: Sonnet 4.6 minimum cache block is 1024-2048 tokens — this template
                    // + memory comfortably crosses it for active clients. Short memory may
                    // silently fail to cache; see AI-SPEC §4 "Caching gotcha".
                    'cache_control' => ['type' => 'ephemeral'],
                ],
            ],
            $userMessage,
        ];
    }
}

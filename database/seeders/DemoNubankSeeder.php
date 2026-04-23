<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Database\Seeders;

use App\Models\Client;
use App\Models\Demand;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoNubankSeeder extends Seeder
{
    public function run(): void
    {
        $user   = User::first();
        $orgId  = $user->organization_id;
        $userId = $user->id;

        // ── Cliente: Nubank ──────────────────────────────────────────────────
        $nubank = Client::create([
            'organization_id'    => $orgId,
            'name'               => 'Nubank',
            'segment'            => 'Fintech / Serviços Financeiros',
            'channels'           => ['instagram', 'linkedin', 'tiktok', 'youtube'],
            'tone_of_voice'      => 'Direto, humano e descomplicado. Foge do jargão bancário tradicional. Usa linguagem acessível para explicar finanças complexas. Tom empático, próximo do cliente, às vezes com humor leve.',
            'target_audience'    => 'Brasileiros de 20 a 40 anos que querem simplicidade financeira, transparência em tarifas e um banco que "fala a língua deles". Forte apelo a quem foi rejeitado por bancos tradicionais.',
            'brand_references'   => 'Roxo vibrante como cor-chave. Ilustrações simples e acessíveis. Copywriting que transforma termos financeiros complexos em algo compreensível. Campanha "Menos burocracia, mais vida".',
            'briefing'           => 'Nubank é o maior banco digital independente do mundo. Fundado em 2013 em São Paulo, hoje atende mais de 100 milhões de clientes na América Latina. Produto flagship: cartão de crédito sem anuidade gerenciado pelo app. Oferece também conta corrente, NuInvest (investimentos), seguros e crédito pessoal. Missão: devolver às pessoas o controle sobre a vida financeira, eliminando a complexidade e as taxas abusivas dos bancos tradicionais.',
            'monthly_posts'      => 20,
            'monthly_plan_notes' => 'Foco em educação financeira, lançamento de produtos e campanhas sazonais (Dia das Mães, Black Friday, virada de ano). Manter sempre o tom humano e acessível. Nunca usar linguagem de "banco tradicional".',
            'planning_day'       => 1,
            'social_handles'     => [
                'website'   => 'https://nubank.com.br',
                'instagram' => '@nubank',
                'linkedin'  => 'company/nubank',
                'tiktok'    => '@nubank',
            ],
        ]);

        // ── Demandas ─────────────────────────────────────────────────────────
        $demands = [
            [
                'type'        => 'demand',
                'title'       => 'Post Instagram — Lançamento Nubank Ultravioleta',
                'description' => 'Criar post para o Instagram anunciando o cartão Nubank Ultravioleta, voltado para clientes premium. Destacar os benefícios exclusivos: cashback de 1% em todas as compras, limite sem teto e acesso a lounge nos aeroportos.',
                'objective'   => 'Gerar desejo e awareness sobre o novo tier premium. Incentivar clientes elegíveis a solicitar o upgrade no app.',
                'tone'        => 'Aspiracional mas acessível. Orgulho sem arrogância. Roxo intenso como elemento visual principal.',
                'channel'     => 'instagram',
                'status'      => 'todo',
                'deadline'    => now()->addDays(5)->format('Y-m-d'),
            ],
            [
                'type'        => 'demand',
                'title'       => 'Campanha LinkedIn — Nubank como empregadora',
                'description' => 'Série de 3 posts para o LinkedIn posicionando o Nubank como uma das melhores empresas para se trabalhar no Brasil. Abordar: cultura de inovação, diversidade, crescimento acelerado e impacto real na vida das pessoas.',
                'objective'   => 'Atrair talentos tech e de negócios. Fortalecer employer branding no LinkedIn onde profissionais qualificados tomam decisões de carreira.',
                'tone'        => 'Profissional mas humano. Histórias reais de funcionários. Dados concretos sobre crescimento.',
                'channel'     => 'linkedin',
                'status'      => 'in_progress',
                'deadline'    => now()->addDays(10)->format('Y-m-d'),
            ],
            [
                'type'        => 'demand',
                'title'       => 'TikTok — Série "Educação Financeira em 60 segundos"',
                'description' => 'Criar roteiro para 5 vídeos curtos no TikTok explicando conceitos financeiros de forma divertida e acessível: CDI, Selic, como funciona o cartão de crédito, juros compostos e como montar reserva de emergência.',
                'objective'   => 'Engajar público jovem (18-25 anos) com conteúdo educativo leve. Reforçar o posicionamento do Nubank como "o banco que explica as coisas de forma simples".',
                'tone'        => 'Descontraído, dinâmico, usa gírias com moderação. Formato tutorial com humor sem forçar.',
                'channel'     => 'tiktok',
                'status'      => 'todo',
                'deadline'    => now()->addDays(7)->format('Y-m-d'),
            ],
            [
                'type'        => 'demand',
                'title'       => 'Blog — "5 hábitos financeiros para quem quer sair do vermelho em 2026"',
                'description' => 'Artigo de blog longo (1500-2000 palavras) com dicas práticas de organização financeira para o público brasileiro. Integrar naturalmente os produtos Nubank como ferramentas (conta, NuInvest, cartão).',
                'objective'   => 'SEO orgânico para termos como "como sair das dívidas", "organizar finanças 2026". Converter visitantes em novos clientes.',
                'tone'        => 'Didático, amigável, sem julgamentos. Empático com quem está em dificuldade financeira.',
                'channel'     => 'blog',
                'status'      => 'awaiting_feedback',
                'deadline'    => now()->addDays(14)->format('Y-m-d'),
            ],
            [
                'type'        => 'demand',
                'title'       => 'Email marketing — Black Friday NuInvest',
                'description' => 'Email para a base de clientes Nubank promovendo condições especiais da Black Friday no NuInvest: fundos com taxa zero por 12 meses, CDB com rentabilidade diferenciada e cashback em investimentos.',
                'objective'   => 'Aumentar base de investidores ativos no NuInvest. Meta: 15% taxa de abertura, 5% de clique.',
                'tone'        => 'Urgência sem ser agressivo. Clareza nos benefícios. CTA direta.',
                'channel'     => 'email',
                'status'      => 'todo',
                'deadline'    => now()->addDays(21)->format('Y-m-d'),
            ],
            [
                'type'        => 'demand',
                'title'       => 'Reels Instagram — Bastidores do atendimento Nubank',
                'description' => 'Vídeo mostrando como funciona o atendimento via chat: resposta rápida, sem transferências infinitas, resolução no primeiro contato. Humanizar os "Xpeers" (atendentes Nubank).',
                'objective'   => 'Diferenciar o atendimento Nubank dos bancos tradicionais. Reduzir o medo de migrar para banco digital.',
                'tone'        => 'Autêntico, transparente. Pessoas reais, não atores. Tom de orgulho genuíno.',
                'channel'     => 'instagram',
                'status'      => 'in_review',
                'deadline'    => now()->addDays(3)->format('Y-m-d'),
            ],
            [
                'type'        => 'planning',
                'title'       => 'Planejamento de conteúdo — Janeiro 2026',
                'description' => 'Planejamento completo de conteúdo para todas as redes sociais do Nubank em janeiro de 2026. Incluir virada de ano, resoluções financeiras e campanha "Ano novo, finanças novas".',
                'objective'   => 'Presença consistente em todas as plataformas em janeiro. Aproveitar o momentum de início de ano para temas de educação financeira.',
                'tone'        => 'Motivador, inspirador, com leveza. Capitalizar no espírito de resolução de metas sem ser clichê.',
                'channel'     => 'instagram',
                'status'      => 'todo',
                'deadline'    => now()->addDays(30)->format('Y-m-d'),
            ],
        ];

        foreach ($demands as $data) {
            Demand::create(array_merge($data, [
                'organization_id' => $orgId,
                'client_id'       => $nubank->id,
                'created_by'      => $userId,
                'assigned_to'     => $userId,
            ]));
        }

        $this->command->info("✓ Nubank criado (ID {$nubank->id}) com " . count($demands) . " demandas.");
    }
}

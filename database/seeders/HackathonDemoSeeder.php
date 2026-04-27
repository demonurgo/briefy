<?php
// (c) 2026 Briefy contributors - AGPL-3.0

namespace Database\Seeders;

use App\Models\AiConversation;
use App\Models\AiConversationMessage;
use App\Models\Client;
use App\Models\ClientAiMemory;
use App\Models\ClientEvent;
use App\Models\ClientResearchSession;
use App\Models\Demand;
use App\Models\DemandComment;
use App\Models\PlanningSuggestion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HackathonDemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->orderBy('id')->firstOrFail();
        $orgId = $user->current_organization_id;
        $userId = $user->id;

        DB::transaction(function () use ($orgId, $userId) {
            Client::query()
                ->where('organization_id', $orgId)
                ->get()
                ->each(fn (Client $client) => $client->delete());

            $client = Client::create([
                'organization_id' => $orgId,
                'name' => 'Ritual Coffee Studio',
                'segment' => 'Specialty coffee, cafe culture, and home brewing education',
                'channels' => ['instagram', 'linkedin', 'tiktok', 'youtube', 'email', 'blog'],
                'tone_of_voice' => 'Warm, precise, and quietly premium. Explains coffee with confidence, but never sounds snobbish. Uses sensory language, practical tips, and short human stories from growers, baristas, and customers.',
                'target_audience' => 'Urban professionals and curious beginners, 24 to 42, who want better coffee at home and like brands with craft, sustainability, and good design. They follow food, lifestyle, creator economy, and boutique hospitality content.',
                'brand_references' => 'Editorial photography, natural light, close-ups of hands, beans, ceramic cups, and cafe rituals. Visual mood: charcoal, ivory, sage green, brushed steel, and a small amber accent. Avoid generic stock cups and overly rustic coffee cliches.',
                'briefing' => "Ritual Coffee Studio is a fictional specialty coffee brand with three cafes, a subscription program, and a small online academy for home brewing.\n\nThe business goal for the next month is to launch the Morning Ritual subscription, grow workshop signups, and make coffee education feel approachable. The brand wants content that feels useful enough to save, beautiful enough to share, and clear enough to convert.",
                'monthly_posts' => 12,
                'monthly_plan_notes' => 'Plan around the Morning Ritual subscription launch, International Coffee Day, beginner brewing education, behind-the-scenes roasting, and workshop enrollment. Keep the mix balanced: 50% education, 25% product, 15% community, 10% founder/story.',
                'planning_day' => 1,
                'social_handles' => [
                    'website' => 'https://ritualcoffeestudio.example',
                    'instagram' => '@ritualcoffeestudio',
                    'linkedin' => 'company/ritual-coffee-studio',
                    'tiktok' => '@ritualcoffee',
                    'youtube' => '@ritualcoffeestudio',
                ],
                'important_dates' => [
                    ['label' => 'Morning Ritual subscription launch', 'month' => 5, 'day' => 6],
                    ['label' => 'Home Brewing Workshop cohort opens', 'month' => 5, 'day' => 14],
                    ['label' => 'International Coffee Day campaign planning', 'month' => 10, 'day' => 1],
                    ['label' => 'Holiday gifting pre-sale', 'month' => 11, 'day' => 18],
                ],
            ]);

            $memories = [
                ['tone', 'Use a calm expert voice: practical, sensory, and welcoming. Never shame beginners for not knowing coffee terms.', 0.94],
                ['audience', 'Most new customers are home-brewing beginners who own a simple V60, moka pot, or French press.', 0.91],
                ['patterns', 'Saveable carousels perform best when each slide answers one concrete brewing question.', 0.88],
                ['preferences', 'The client prefers direct CTAs such as "Choose your roast" and "Book a workshop seat" over vague lifestyle CTAs.', 0.86],
                ['avoid', 'Avoid generic latte art stock footage, cafe hustle cliches, and language that makes specialty coffee feel elitist.', 0.9],
                ['terminology', 'Use "daily cup", "home setup", "grind size", "fresh roast", and "morning ritual" consistently across campaign copy.', 0.84],
            ];

            foreach ($memories as [$category, $insight, $confidence]) {
                ClientAiMemory::create([
                    'client_id' => $client->id,
                    'organization_id' => $orgId,
                    'category' => $category,
                    'insight' => $insight,
                    'confidence' => $confidence,
                    'source' => 'managed_agent_onboarding',
                    'insight_hash' => sha1(Str::lower($insight)),
                    'status' => 'active',
                ]);
            }

            foreach ([
                ['Morning Ritual subscription launch', '2026-05-06', false],
                ['First public cupping night', '2026-05-21', false],
                ['Holiday gifting pre-sale', '2026-11-18', true],
            ] as [$title, $date, $recurrent]) {
                ClientEvent::create([
                    'client_id' => $client->id,
                    'title' => $title,
                    'date' => $date,
                    'recurrent' => $recurrent,
                    'source' => 'manual',
                ]);
            }

            $researchInsights = array_map(
                fn ($memory) => ['category' => $memory[0], 'insight' => $memory[1], 'confidence' => $memory[2]],
                $memories
            );

            ClientResearchSession::create([
                'client_id' => $client->id,
                'managed_agent_session_id' => 'demo_' . Str::uuid(),
                'status' => 'completed',
                'started_at' => Carbon::now()->subHours(3),
                'completed_at' => Carbon::now()->subHours(2)->subMinutes(42),
                'progress_summary' => 'Mapped voice, audience, competitors, content references, and saved client memory.',
                'full_report' => [
                    'generated_at' => Carbon::now()->subHours(2)->subMinutes(42)->toISOString(),
                    'client_name' => 'Ritual Coffee Studio',
                    'total_raw' => 9,
                    'total_saved' => count($researchInsights),
                    'insights' => [
                        ...$researchInsights,
                        ['category' => 'patterns', 'insight' => 'Short videos with hands-on brewing steps are likely to outperform abstract brand films.', 'confidence' => 0.79],
                        ['category' => 'preferences', 'insight' => 'Use product photography only when paired with a practical reason to care.', 'confidence' => 0.76],
                        ['category' => 'avoid', 'insight' => 'Do not overuse words like artisanal, authentic, or passionate without a concrete proof point.', 'confidence' => 0.72],
                    ],
                ],
            ]);

            $planning = Demand::create([
                'organization_id' => $orgId,
                'client_id' => $client->id,
                'type' => 'planning',
                'title' => 'May 2026 content calendar - Morning Ritual launch',
                'description' => 'AI-generated monthly planning for Ritual Coffee Studio, focused on subscription launch, brewing education, and workshop enrollment.',
                'objective' => 'Create a full month of content that turns coffee curiosity into subscription trials and workshop bookings.',
                'tone' => 'Calm, useful, sensory, and modern.',
                'channel' => 'instagram',
                'deadline' => '2026-05-01',
                'status' => 'todo',
                'priority' => 'high',
                'ai_analysis' => [
                    'status' => 'completed',
                    'target_year' => 2026,
                    'target_month' => 5,
                    'summary' => '12-item plan generated from saved client research, monthly quota, and important dates.',
                ],
                'created_by' => $userId,
                'assigned_to' => $userId,
            ]);

            $convertedDemand = null;
            $suggestions = [
                ['2026-05-02', 'instagram', 'Carousel - The 5-minute morning coffee reset', 'A saveable carousel that shows beginners how to improve tomorrow morning coffee with water temperature, grind size, ratio, and one small tasting note.'],
                ['2026-05-05', 'tiktok', 'Short video - Grind size explained with salt, sand, and sugar', 'A fast visual analogy that makes grind size instantly understandable for new home brewers.'],
                ['2026-05-06', 'instagram', 'Launch post - Meet the Morning Ritual subscription', 'A polished product announcement connecting fresh roast delivery to calmer, better mornings.'],
                ['2026-05-09', 'email', 'Email - Your first bag should not feel like a guess', 'A conversion email that helps customers choose a roast profile based on taste preferences instead of technical jargon.'],
                ['2026-05-12', 'linkedin', 'Founder note - Why we built a subscription for ordinary mornings', 'A reflective LinkedIn post about making specialty coffee more accessible without losing craft.'],
                ['2026-05-14', 'instagram', 'Workshop push - Brew better coffee at home in one Saturday', 'A direct enrollment post for the Home Brewing Workshop, built around confidence and hands-on practice.'],
                ['2026-05-17', 'youtube', 'Video - Dial in a V60 without overthinking it', 'A practical tutorial with a simple troubleshooting framework: sour, bitter, weak, or flat.'],
                ['2026-05-21', 'instagram', 'Community post - First public cupping night', 'A warm invitation showing the event as approachable for curious beginners, not just coffee experts.'],
                ['2026-05-25', 'blog', 'Blog - How to choose coffee beans for your home setup', 'SEO-focused educational article that naturally leads readers into the subscription quiz.'],
                ['2026-05-29', 'tiktok', 'Short video - Three signs your beans are stale', 'A quick, useful video with clear visual proof points and a gentle subscription CTA.'],
            ];

            foreach ($suggestions as $index => [$date, $channel, $title, $description]) {
                $status = $index === 2 ? 'accepted' : ($index === 4 ? 'rejected' : 'pending');
                if ($index === 2) {
                    $convertedDemand = $this->createDemand($orgId, $client->id, $userId, [
                        'title' => 'Launch post - Meet the Morning Ritual subscription',
                        'description' => "Create a premium but approachable Instagram launch post for the Morning Ritual subscription.\n\nThe post should introduce fresh-roasted coffee delivered on a predictable rhythm, explain who it is for, and make choosing a roast feel simple.",
                        'objective' => 'Drive qualified visitors to the subscription page and make the new offer feel clear, useful, and desirable.',
                        'tone' => 'Warm, polished, sensory, and beginner-friendly.',
                        'channel' => 'instagram',
                        'deadline' => '2026-05-06',
                        'status' => 'in_progress',
                        'priority' => 'high',
                    ]);
                }

                PlanningSuggestion::create([
                    'demand_id' => $planning->id,
                    'date' => $date,
                    'title' => $title,
                    'description' => $description,
                    'channel' => $channel,
                    'status' => $status,
                    'converted_demand_id' => $index === 2 ? $convertedDemand?->id : null,
                ]);
            }

            $demoDemands = [
                [
                    'title' => 'Carousel - The 5-minute morning coffee reset',
                    'description' => "Create a 7-slide Instagram carousel that helps beginners make better coffee tomorrow morning.\n\nEach slide should focus on one tiny change: fresh water, ratio, grind size, heat, bloom, tasting, and storage.",
                    'objective' => 'Generate saves and shares while positioning Ritual Coffee Studio as the friendly expert for home brewing.',
                    'tone' => 'Practical, encouraging, and quietly premium.',
                    'channel' => 'instagram',
                    'deadline' => '2026-05-02',
                    'status' => 'todo',
                    'priority' => 'high',
                ],
                [
                    'title' => 'TikTok - Grind size explained with salt, sand, and sugar',
                    'description' => 'Film a 30-second vertical video using simple kitchen textures to explain coarse, medium, and fine grind sizes. End with a visual comparison for French press, V60, and espresso.',
                    'objective' => 'Make a technical topic instantly understandable and bring new viewers into the brand through useful education.',
                    'tone' => 'Fast, visual, playful, but not childish.',
                    'channel' => 'tiktok',
                    'deadline' => '2026-05-05',
                    'status' => 'in_review',
                    'priority' => 'medium',
                ],
                [
                    'title' => 'Email - Your first bag should not feel like a guess',
                    'description' => 'Write a launch email that helps subscribers choose the right roast profile. Include a simple taste path: chocolatey, fruity, balanced, or adventurous.',
                    'objective' => 'Move email subscribers from curiosity to first subscription purchase.',
                    'tone' => 'Helpful, confident, and conversion-focused without pressure.',
                    'channel' => 'email',
                    'deadline' => '2026-05-09',
                    'status' => 'awaiting_feedback',
                    'priority' => 'high',
                ],
                [
                    'title' => 'YouTube - Dial in a V60 without overthinking it',
                    'description' => 'Create a 6-minute tutorial that gives beginners a simple troubleshooting framework for sour, bitter, weak, or flat coffee.',
                    'objective' => 'Build trust through a genuinely useful tutorial and direct viewers to the workshop waitlist.',
                    'tone' => 'Calm teacher, no jargon unless explained immediately.',
                    'channel' => 'youtube',
                    'deadline' => '2026-05-17',
                    'status' => 'approved',
                    'priority' => 'medium',
                ],
                [
                    'title' => 'Blog - How to choose coffee beans for your home setup',
                    'description' => 'SEO article for beginners comparing roast profile, process, brew method, and freshness. Include a soft CTA to take the subscription quiz.',
                    'objective' => 'Capture search intent and convert readers into subscribers or workshop leads.',
                    'tone' => 'Editorial, clear, and useful.',
                    'channel' => 'blog',
                    'deadline' => '2026-05-25',
                    'status' => 'todo',
                    'priority' => 'medium',
                ],
            ];

            $created = collect([$convertedDemand])->filter();
            foreach ($demoDemands as $data) {
                $created->push($this->createDemand($orgId, $client->id, $userId, $data));
            }

            $heroDemand = $convertedDemand;
            if ($heroDemand) {
                $heroDemand->update([
                    'ai_analysis' => [
                        'brief' => $this->briefMarkdown(),
                        'brief_generated_at' => Carbon::now()->subMinutes(35)->toISOString(),
                        'brief_edited_at' => Carbon::now()->subMinutes(12)->toISOString(),
                    ],
                ]);

                DemandComment::create([
                    'demand_id' => $heroDemand->id,
                    'user_id' => $userId,
                    'body' => 'Client note: keep this launch clear enough for beginners. The strongest hook is not convenience; it is removing the guesswork from buying good coffee.',
                    'source' => 'user',
                ]);

                DemandComment::create([
                    'demand_id' => $heroDemand->id,
                    'user_id' => $userId,
                    'body' => 'Production note: use close-ups of the subscription box, beans being poured, and a calm morning table setup. Avoid busy cafe shots.',
                    'source' => 'user',
                ]);

                $conversation = AiConversation::create([
                    'organization_id' => $orgId,
                    'user_id' => $userId,
                    'context_type' => 'demand',
                    'context_id' => $heroDemand->id,
                    'title' => 'Launch angle refinement',
                ]);

                foreach ([
                    ['user', 'Give me a lighter angle for this launch post, aimed at people buying specialty coffee for the first time.'],
                    ['assistant', "A lighter angle would be: \"Good coffee should not require a spreadsheet.\"\n\nFrame the subscription as a simple morning upgrade: choose the flavor direction, get fresh coffee on a rhythm, and learn as you go. The post can reassure beginners that they do not need advanced gear or deep coffee vocabulary to start."],
                    ['user', 'Can you rewrite the objective in that direction?'],
                    ['assistant', 'Objective: introduce Morning Ritual as the simplest way for beginners to enjoy fresh specialty coffee at home, removing the anxiety of choosing beans while keeping the experience beautiful, personal, and easy to repeat.'],
                ] as [$role, $content]) {
                    AiConversationMessage::create([
                        'conversation_id' => $conversation->id,
                        'role' => $role,
                        'content' => $content,
                        'tokens_used' => 120,
                    ]);
                }
            }

            $this->createSupportingClients($orgId, $userId);

            $this->command?->info('Hackathon demo client created: Ritual Coffee Studio');
            $this->command?->info('Client ID: ' . $client->id);
            $this->command?->info('Hero demand ID: ' . ($heroDemand?->id ?? 'n/a'));
        });
    }

    private function createDemand(int $orgId, int $clientId, int $userId, array $data): Demand
    {
        return Demand::create([
            'organization_id' => $orgId,
            'client_id' => $clientId,
            'type' => 'demand',
            'title' => $data['title'],
            'description' => $data['description'],
            'objective' => $data['objective'],
            'tone' => $data['tone'],
            'channel' => $data['channel'],
            'deadline' => $data['deadline'],
            'status' => $data['status'],
            'priority' => $data['priority'],
            'created_by' => $userId,
            'assigned_to' => $userId,
        ]);
    }

    private function briefMarkdown(): string
    {
        return <<<'MD'
## Creative Brief

### Demand
Launch post - Meet the Morning Ritual subscription

### Objective
Introduce Morning Ritual as the simplest way for beginners to enjoy fresh specialty coffee at home, removing the anxiety of choosing beans while keeping the experience beautiful, personal, and easy to repeat.

### Core Message
Good coffee should not require guesswork. Ritual Coffee Studio helps customers choose a flavor direction, receive fresh roast on a rhythm, and build a better morning one cup at a time.

### Audience
Curious beginners who want better coffee at home but feel overwhelmed by roast levels, origins, gear, and brewing vocabulary.

### Tone
Warm, precise, sensory, and welcoming. The copy should feel like a calm barista explaining the next best step.

### Suggested Structure
1. Hook: "Your morning coffee should feel easy before it tastes exceptional."
2. Problem: choosing beans can feel confusing when every bag sounds technical.
3. Solution: Morning Ritual matches fresh coffee to the customer's taste direction.
4. Proof: roasted fresh, delivered on schedule, supported by simple brewing notes.
5. CTA: "Choose your roast and start your Morning Ritual."

### Visual Direction
Natural morning light, close-up of beans, ceramic cup, subscription box, handwritten tasting card, and a clean kitchen counter. Avoid busy cafe scenes and generic latte art.

### CTA
Choose your roast.
MD;
    }

    private function createSupportingClients(int $orgId, int $userId): void
    {
        $skinLab = Client::create([
            'organization_id' => $orgId,
            'name' => 'Northstar Skin Lab',
            'segment' => 'Clean skincare and dermatologist-led education',
            'channels' => ['instagram', 'tiktok', 'email', 'blog'],
            'tone_of_voice' => 'Clinical but kind. Evidence-led, direct, and reassuring. Avoid fear-based beauty language.',
            'target_audience' => 'People 25 to 40 who want simple skincare routines, ingredient clarity, and fewer product mistakes.',
            'brand_references' => 'Minimal packaging, soft white backgrounds, macro textures, dermatologist notes, and calm routine photography.',
            'briefing' => 'Northstar Skin Lab sells a focused skincare line and uses education to make routines simpler. The next campaign promotes a barrier-repair serum and a routine quiz.',
            'monthly_posts' => 8,
            'monthly_plan_notes' => 'Balance ingredient education, myth-busting, customer routines, and serum launch content.',
            'planning_day' => 2,
            'social_handles' => [
                'website' => 'https://northstarskin.example',
                'instagram' => '@northstarskinlab',
                'tiktok' => '@northstarskinlab',
            ],
            'important_dates' => [
                ['label' => 'Barrier serum launch', 'month' => 5, 'day' => 12],
                ['label' => 'Summer routine campaign', 'month' => 6, 'day' => 3],
            ],
        ]);

        $this->createDemand($orgId, $skinLab->id, $userId, [
            'title' => 'Carousel - Skin barrier myths that slow down recovery',
            'description' => 'Create a simple myth-busting carousel explaining what a damaged skin barrier looks like and which habits make it worse.',
            'objective' => 'Educate the audience and create demand for the new barrier-repair serum.',
            'tone' => 'Clinical, calm, and reassuring.',
            'channel' => 'instagram',
            'deadline' => '2026-05-10',
            'status' => 'todo',
            'priority' => 'medium',
        ]);

        $this->createDemand($orgId, $skinLab->id, $userId, [
            'title' => 'Email - Find your three-step summer routine',
            'description' => 'Write an email that invites subscribers to take the routine quiz and discover a minimal summer skincare setup.',
            'objective' => 'Drive quiz completions and product bundle clicks.',
            'tone' => 'Helpful, clear, and lightly premium.',
            'channel' => 'email',
            'deadline' => '2026-05-18',
            'status' => 'in_progress',
            'priority' => 'medium',
        ]);

        $home = Client::create([
            'organization_id' => $orgId,
            'name' => 'Verde Home Goods',
            'segment' => 'Sustainable home essentials and small-space living',
            'channels' => ['instagram', 'linkedin', 'youtube', 'email'],
            'tone_of_voice' => 'Practical, optimistic, and design-aware. Talks about sustainability through better everyday choices, not guilt.',
            'target_audience' => 'Apartment dwellers, young families, and design-conscious shoppers who want durable, low-waste home products.',
            'brand_references' => 'Bright apartments, modular storage, warm woods, recycled materials, and clean product demonstrations.',
            'briefing' => 'Verde Home Goods makes durable home essentials from recycled and low-impact materials. The next campaign focuses on small-space organization.',
            'monthly_posts' => 10,
            'monthly_plan_notes' => 'Prioritize small-space tips, product demos, material transparency, and customer before-and-after stories.',
            'planning_day' => 3,
            'social_handles' => [
                'website' => 'https://verdehome.example',
                'instagram' => '@verdehomegoods',
                'linkedin' => 'company/verde-home-goods',
            ],
            'important_dates' => [
                ['label' => 'Small-space collection launch', 'month' => 5, 'day' => 20],
                ['label' => 'Sustainability report', 'month' => 6, 'day' => 12],
            ],
        ]);

        $this->createDemand($orgId, $home->id, $userId, [
            'title' => 'Reels - Three storage swaps for a calmer entryway',
            'description' => 'Create a before-and-after vertical video showing three practical swaps using Verde products.',
            'objective' => 'Show immediate usefulness and drive product page visits.',
            'tone' => 'Helpful, optimistic, and visually clean.',
            'channel' => 'instagram',
            'deadline' => '2026-05-13',
            'status' => 'awaiting_feedback',
            'priority' => 'low',
        ]);

        $this->createDemand($orgId, $home->id, $userId, [
            'title' => 'LinkedIn - What durability means in sustainable design',
            'description' => 'Write a founder-led LinkedIn post about why long product life matters more than trend-driven eco claims.',
            'objective' => 'Build brand credibility with buyers, partners, and design press.',
            'tone' => 'Thoughtful, specific, and evidence-based.',
            'channel' => 'linkedin',
            'deadline' => '2026-05-22',
            'status' => 'approved',
            'priority' => 'medium',
        ]);
    }
}

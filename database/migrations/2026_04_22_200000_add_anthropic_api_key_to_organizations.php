<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->text('anthropic_api_key_encrypted')->nullable()->after('settings');
            // L1 — no mask column; derived via accessor on Organization model.
            // M3 — persisted key health, surfaced via Inertia share and checked by AI gates.
            $table->boolean('anthropic_key_valid')->default(false)->after('anthropic_api_key_encrypted');
            $table->boolean('anthropic_managed_agents_ok')->default(false)->after('anthropic_key_valid');
            $table->timestamp('anthropic_key_checked_at')->nullable()->after('anthropic_managed_agents_ok');
            $table->string('client_research_agent_id')->nullable()->after('anthropic_key_checked_at');
            $table->string('client_research_environment_id')->nullable()->after('client_research_agent_id');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'anthropic_api_key_encrypted',
                'anthropic_key_valid', 'anthropic_managed_agents_ok', 'anthropic_key_checked_at',
                'client_research_agent_id', 'client_research_environment_id',
            ]);
        });
    }
};

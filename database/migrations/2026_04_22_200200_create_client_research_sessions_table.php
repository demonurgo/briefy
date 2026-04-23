<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_research_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('managed_agent_session_id')->nullable()->index();
            $table->enum('status', ['queued', 'running', 'idle', 'completed', 'failed', 'terminated'])->default('queued');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('events_url')->nullable();
            $table->text('progress_summary')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_research_sessions');
    }
};

<?php
// (c) 2026 Briefy contributors — AGPL-3.0

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('action_type', [
                'demand.status_changed',
                'demand.created',
                'demand.comment_added',
                'demand.assigned',
                'demand.archived',
                'demand.restored',
                'client.created',
                'member.invited',
            ]);
            $table->string('subject_type', 50);
            $table->unsignedBigInteger('subject_id');
            $table->string('subject_name');
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // Sem updated_at — log é imutável

            // Indexes (review Codex: HIGH — feed hits org+created_at constantly)
            $table->index(['organization_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};

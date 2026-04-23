<?php
// (c) 2026 Briefy contributors — AGPL-3.0

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('demands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['demand', 'planning'])->default('demand');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('objective')->nullable();
            $table->string('tone')->nullable();
            $table->string('channel')->nullable();
            $table->date('deadline')->nullable();
            $table->enum('status', ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'])->default('todo');
            $table->unsignedTinyInteger('recurrence_day')->nullable();
            $table->json('ai_analysis')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('demands');
    }
};

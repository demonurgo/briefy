<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedSmallInteger('monthly_posts')->nullable()->after('avatar');
            $table->text('monthly_plan_notes')->nullable()->after('monthly_posts');
            $table->unsignedTinyInteger('planning_day')->nullable()->after('monthly_plan_notes');
            $table->json('social_handles')->nullable()->after('planning_day');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['monthly_posts', 'monthly_plan_notes', 'planning_day', 'social_handles']);
        });
    }
};

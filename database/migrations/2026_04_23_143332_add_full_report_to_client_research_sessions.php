<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_research_sessions', function (Blueprint $table) {
            // Full structured report from the MA session — stored as JSON
            $table->json('full_report')->nullable()->after('progress_summary');
        });
    }

    public function down(): void
    {
        Schema::table('client_research_sessions', function (Blueprint $table) {
            $table->dropColumn('full_report');
        });
    }
};

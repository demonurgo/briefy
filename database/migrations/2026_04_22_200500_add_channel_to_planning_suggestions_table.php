<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planning_suggestions', function (Blueprint $table) {
            $table->string('channel')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('planning_suggestions', function (Blueprint $table) {
            $table->dropColumn('channel');
        });
    }
};

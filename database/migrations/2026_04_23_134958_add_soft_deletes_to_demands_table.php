<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};

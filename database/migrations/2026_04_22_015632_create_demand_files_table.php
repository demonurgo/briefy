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
        Schema::create('demand_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demand_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['upload', 'link']);
            $table->string('name');
            $table->string('path_or_url');
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('demand_files');
    }
};

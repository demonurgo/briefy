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
        Schema::create('planning_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demand_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('title');
            $table->text('description');
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->foreignId('converted_demand_id')->nullable()->constrained('demands')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planning_suggestions');
    }
};

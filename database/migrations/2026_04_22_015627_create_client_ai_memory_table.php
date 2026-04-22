<?php

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
        Schema::create('client_ai_memory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->enum('category', ['preferences', 'rejections', 'tone', 'style', 'audience', 'patterns']);
            $table->text('insight');
            $table->unsignedTinyInteger('confidence')->default(50);
            $table->foreignId('source_demand_id')->nullable()->constrained('demands')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_ai_memory');
    }
};

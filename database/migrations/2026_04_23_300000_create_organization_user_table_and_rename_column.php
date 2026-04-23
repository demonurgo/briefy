<?php
// (c) 2026 Briefy contributors — AGPL-3.0

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Step 1: Create organization_user pivot table
        Schema::create('organization_user', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('collaborator');
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();
            $table->primary(['user_id', 'organization_id']);
        });

        // Step 2: Backfill pivot from existing users.organization_id
        DB::statement("
            INSERT INTO organization_user (user_id, organization_id, role, joined_at, created_at, updated_at)
            SELECT id, organization_id, role, created_at, NOW(), NOW()
            FROM users
            WHERE organization_id IS NOT NULL
        ");

        // Step 3: Rename users.organization_id → users.current_organization_id
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('organization_id', 'current_organization_id');
        });
    }

    public function down(): void
    {
        // Reverse Step 3: rename back
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('current_organization_id', 'organization_id');
        });

        // Reverse Step 1 (pivot data is lost on rollback — acceptable)
        Schema::dropIfExists('organization_user');
    }
};

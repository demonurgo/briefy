<?php
// (c) 2026 Briefy contributors — AGPL-3.0

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Step 1: Drop existing CHECK constraint (PostgreSQL)
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

        // Step 2: Add updated CHECK constraint with owner
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner','admin','collaborator'))");

        // Step 3: Backfill — promote lowest user_id per org to owner (D-12 heuristic)
        // organization_user pivot now exists, use it as source of truth
        DB::statement("
            UPDATE organization_user ou
            SET role = 'owner'
            WHERE (ou.organization_id, ou.user_id) IN (
                SELECT organization_id, MIN(user_id)
                FROM organization_user
                GROUP BY organization_id
            )
        ");

        // Step 4: Sync users.role with pivot role for current org (write-through per Open Question 2)
        DB::statement("
            UPDATE users u
            SET role = ou.role
            FROM organization_user ou
            WHERE ou.user_id = u.id
            AND ou.organization_id = u.current_organization_id
        ");
    }

    public function down(): void
    {
        // Revert owners back to admin before dropping constraint
        DB::statement("UPDATE users SET role = 'admin' WHERE role = 'owner'");
        DB::statement("UPDATE organization_user SET role = 'admin' WHERE role = 'owner'");

        // Drop the updated constraint
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");

        // Restore original constraint (admin|collaborator only)
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','collaborator'))");
    }
};

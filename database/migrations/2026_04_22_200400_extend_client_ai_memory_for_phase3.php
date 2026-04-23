<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // STEP 1: Add nullable columns (safe to add without data).
        Schema::table('client_ai_memory', function (Blueprint $table) {
            // H1 — organization scope (security; plan 07/12 use this to prevent cross-org reads)
            $table->foreignId('organization_id')->nullable()->after('client_id');

            // H1 — insight source (differentiates chat-extracted vs managed-agent-onboarded)
            $table->string('source')->nullable()->default('chat')->after('confidence');

            // H1 — content hash for idempotent upserts (used by ClientMemoryExtractor)
            $table->string('insight_hash', 64)->nullable()->after('source');

            // D-38 — suggestion lifecycle
            $table->enum('status', ['active', 'suggested', 'dismissed'])->default('active')->after('insight_hash');

            // Composite indexes for idempotent upsert + suggestion queries.
            $table->index(['client_id', 'category', 'insight_hash'], 'cam_client_cat_hash_idx');
            $table->index(['client_id', 'status'], 'cam_client_status_idx');
        });

        // STEP 2: Backfill organization_id from client.organization_id.
        DB::statement(<<<'SQL'
            UPDATE client_ai_memory
               SET organization_id = (
                   SELECT clients.organization_id
                     FROM clients
                    WHERE clients.id = client_ai_memory.client_id
               )
             WHERE organization_id IS NULL
        SQL);

        // STEP 3: Migrate confidence column from unsignedTinyInteger (0-100) to decimal(3,2) (0.00-1.00).
        // Use a temporary column to avoid data loss on the alter.
        Schema::table('client_ai_memory', function (Blueprint $table) {
            $table->decimal('confidence_new', 3, 2)->nullable()->after('confidence');
        });

        // Backfill: legacy_confidence (0-100) → new_confidence (0.00-1.00).
        DB::statement(<<<'SQL'
            UPDATE client_ai_memory
               SET confidence_new = ROUND(CAST(confidence AS DECIMAL(5,2)) / 100.0, 2)
        SQL);

        // Drop old tinyint column, then rename new to confidence.
        // PostgreSQL path: DROP CONSTRAINT via raw SQL (ALTER TABLE DROP CONSTRAINT),
        // then RENAME COLUMN via raw SQL. No doctrine/dbal needed.
        if (DB::connection()->getDriverName() === 'pgsql') {
            Schema::table('client_ai_memory', function (Blueprint $table) {
                $table->dropColumn('confidence');
            });
            DB::statement('ALTER TABLE client_ai_memory RENAME COLUMN confidence_new TO confidence');
        } elseif (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite: drop old column + rename new via Schema (Laravel 10+ supports this).
            Schema::table('client_ai_memory', function (Blueprint $table) {
                $table->dropColumn('confidence');
            });
            Schema::table('client_ai_memory', function (Blueprint $table) {
                $table->renameColumn('confidence_new', 'confidence');
            });
        } else {
            // MySQL/MariaDB fallback — same pattern.
            Schema::table('client_ai_memory', function (Blueprint $table) {
                $table->dropColumn('confidence');
            });
            Schema::table('client_ai_memory', function (Blueprint $table) {
                $table->renameColumn('confidence_new', 'confidence');
            });
        }

        // STEP 4: Expand the category enum from 6 → 8 values (add 'avoid', 'terminology').
        // Laravel's enum() on Postgres uses a CHECK constraint (not a native PG enum type).
        // We drop the old CHECK and add a new one including the two new values.
        if (DB::connection()->getDriverName() === 'pgsql') {
            $constraintName = 'client_ai_memory_category_check';
            DB::statement("ALTER TABLE client_ai_memory DROP CONSTRAINT IF EXISTS {$constraintName}");
            DB::statement(<<<SQL
                ALTER TABLE client_ai_memory
                  ADD CONSTRAINT {$constraintName}
                  CHECK (category IN ('preferences','rejections','tone','style','audience','patterns','avoid','terminology'))
            SQL);
        }
        // On SQLite the CHECK constraint is embedded in the table definition and cannot be easily
        // altered without recreating the table. The PHP-side MemoryInsightSchema enforces the
        // 8-value whitelist, so any DB-level CHECK mismatch surfaces as a clear INSERT failure
        // during testing. Document this in SUMMARY if SQLite is the chosen DB.
    }

    public function down(): void
    {
        Schema::table('client_ai_memory', function (Blueprint $table) {
            $table->dropIndex('cam_client_cat_hash_idx');
            $table->dropIndex('cam_client_status_idx');
            $table->dropColumn(['organization_id', 'source', 'insight_hash', 'status']);
        });

        // Revert confidence to unsignedTinyInteger (0-100). Backfill from decimal * 100.
        Schema::table('client_ai_memory', function (Blueprint $table) {
            $table->unsignedTinyInteger('confidence_old')->default(50)->after('insight');
        });
        DB::statement('UPDATE client_ai_memory SET confidence_old = ROUND(COALESCE(confidence, 0.50) * 100)');
        Schema::table('client_ai_memory', function (Blueprint $table) {
            $table->dropColumn('confidence');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE client_ai_memory RENAME COLUMN confidence_old TO confidence');
        } else {
            Schema::table('client_ai_memory', function (Blueprint $table) {
                $table->renameColumn('confidence_old', 'confidence');
            });
        }

        // On Postgres, restore the original 6-value CHECK (best-effort).
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE client_ai_memory DROP CONSTRAINT IF EXISTS client_ai_memory_category_check');
            DB::statement(<<<'SQL'
                ALTER TABLE client_ai_memory
                  ADD CONSTRAINT client_ai_memory_category_check
                  CHECK (category IN ('preferences','rejections','tone','style','audience','patterns'))
            SQL);
        }
    }
};

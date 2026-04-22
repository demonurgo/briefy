<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->enum('role', ['admin', 'collaborator'])->default('admin')->after('organization_id');
            $table->json('preferences')->default('{"locale":"pt-BR","theme":"light"}')->after('role');
            $table->timestamp('last_login_at')->nullable()->after('preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn(['organization_id', 'role', 'preferences', 'last_login_at']);
        });
    }
};

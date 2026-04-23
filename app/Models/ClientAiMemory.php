<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAiMemory extends Model
{
    protected $table = 'client_ai_memory';
    protected $fillable = [
        'client_id',
        'organization_id',   // H1 — required for security scoping in plans 07/12
        'category',
        'insight',
        'confidence',
        'source',            // H1 — 'chat' | 'managed_agent_onboarding'
        'insight_hash',      // H1 — SHA-1 of normalized insight for idempotent upsert
        'status',            // D-38 — active | suggested | dismissed
        'source_demand_id',
    ];
    protected $casts = [
        'confidence' => 'float',  // H1 — migrated from tinyint to decimal(3,2)
    ];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function sourceDemand(): BelongsTo { return $this->belongsTo(Demand::class, 'source_demand_id'); }
}

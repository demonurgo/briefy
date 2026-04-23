<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;
    protected $fillable = [
        'organization_id', 'name', 'segment', 'channels',
        'tone_of_voice', 'target_audience', 'brand_references', 'briefing', 'avatar',
        'monthly_posts', 'monthly_plan_notes', 'planning_day', 'social_handles',
    ];
    protected $casts = [
        'channels' => 'array',
        'social_handles' => 'array',
        'monthly_posts' => 'integer',
        'planning_day' => 'integer',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function demands(): HasMany { return $this->hasMany(Demand::class); }
    public function events(): HasMany { return $this->hasMany(ClientEvent::class); }
    public function aiMemory(): HasMany { return $this->hasMany(ClientAiMemory::class); }
    public function researchSessions(): HasMany { return $this->hasMany(ClientResearchSession::class); }
}

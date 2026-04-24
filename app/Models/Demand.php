<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Demand extends Model
{
    use HasFactory, SoftDeletes;

    protected static function boot(): void
    {
        parent::boot();
        static::deleting(function (Demand $demand) {
            $demand->files()->delete();
            $demand->comments()->delete();
        });
    }

    protected $fillable = [
        'organization_id', 'client_id', 'type', 'title', 'description',
        'objective', 'tone', 'channel', 'deadline', 'status', 'priority',
        'recurrence_day', 'ai_analysis', 'created_by', 'assigned_to', 'archived_at',
    ];

    protected $casts = [
        'deadline' => 'date',
        'archived_at' => 'datetime',
        'ai_analysis' => 'array',
        'recurrence_day' => 'integer',
        'priority' => 'string',
    ];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function assignee(): BelongsTo { return $this->belongsTo(User::class, 'assigned_to'); }
    public function files(): HasMany { return $this->hasMany(DemandFile::class); }
    public function comments(): HasMany { return $this->hasMany(DemandComment::class)->orderBy('created_at'); }
    public function planningSuggestions(): HasMany { return $this->hasMany(PlanningSuggestion::class); }

    /**
     * AI conversations scoped to this demand.
     * Aliased to `conversations` for frontend clarity (Plan 09).
     */
    public function aiConversations(): HasMany
    {
        return $this->hasMany(AiConversation::class, 'context_id')
            ->where('context_type', 'demand')
            ->orderBy('created_at');
    }
}

<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Demand extends Model
{
    protected $fillable = [
        'organization_id', 'client_id', 'type', 'title', 'description',
        'objective', 'tone', 'channel', 'deadline', 'status',
        'recurrence_day', 'ai_analysis', 'created_by', 'assigned_to',
    ];

    protected $casts = [
        'deadline' => 'date',
        'ai_analysis' => 'array',
        'recurrence_day' => 'integer',
    ];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function assignee(): BelongsTo { return $this->belongsTo(User::class, 'assigned_to'); }
    public function files(): HasMany { return $this->hasMany(DemandFile::class); }
    public function comments(): HasMany { return $this->hasMany(DemandComment::class)->orderBy('created_at'); }
    public function planningSuggestions(): HasMany { return $this->hasMany(PlanningSuggestion::class); }
}

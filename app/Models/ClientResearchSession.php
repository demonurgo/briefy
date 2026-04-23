<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientResearchSession extends Model
{
    protected $fillable = [
        'client_id', 'managed_agent_session_id', 'status',
        'started_at', 'completed_at', 'events_url', 'progress_summary',
    ];
    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['queued', 'running', 'idle']);
    }
}

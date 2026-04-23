<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BriefyNotification extends Model
{
    protected $table = 'briefy_notifications';
    protected $fillable = ['organization_id', 'user_id', 'type', 'title', 'body', 'data', 'read_at'];
    protected $casts = ['data' => 'array', 'read_at' => 'datetime'];
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}

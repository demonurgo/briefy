<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    protected $fillable = ['organization_id', 'user_id', 'context_type', 'context_id', 'title', 'compacted_at'];
    protected $casts = [
        'compacted_at' => 'datetime',
    ];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function messages(): HasMany { return $this->hasMany(AiConversationMessage::class, 'conversation_id')->orderBy('created_at'); }
}

<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiConversationMessage extends Model
{
    protected $fillable = ['conversation_id', 'role', 'content', 'tokens_used'];
    public function conversation(): BelongsTo { return $this->belongsTo(AiConversation::class); }
}

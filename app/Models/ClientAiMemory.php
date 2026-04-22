<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAiMemory extends Model
{
    protected $table = 'client_ai_memory';
    protected $fillable = ['client_id', 'category', 'insight', 'confidence', 'source_demand_id'];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function sourceDemand(): BelongsTo { return $this->belongsTo(Demand::class, 'source_demand_id'); }
}

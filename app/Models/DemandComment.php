<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandComment extends Model
{
    use HasFactory;
    protected $fillable = ['demand_id', 'user_id', 'body', 'source'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}

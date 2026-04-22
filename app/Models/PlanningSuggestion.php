<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanningSuggestion extends Model
{
    protected $fillable = ['demand_id', 'date', 'title', 'description', 'status', 'converted_demand_id'];
    protected $casts = ['date' => 'date'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function convertedDemand(): BelongsTo { return $this->belongsTo(Demand::class, 'converted_demand_id'); }
}

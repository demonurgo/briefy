<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandFile extends Model
{
    protected $fillable = ['demand_id', 'type', 'name', 'path_or_url', 'uploaded_by'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}

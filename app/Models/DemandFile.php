<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandFile extends Model
{
    use HasFactory;
    protected $fillable = ['demand_id', 'type', 'name', 'path_or_url', 'uploaded_by'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}

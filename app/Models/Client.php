<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'organization_id', 'name', 'segment', 'channels',
        'tone_of_voice', 'target_audience', 'brand_references', 'briefing', 'avatar',
    ];
    protected $casts = ['channels' => 'array'];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function demands(): HasMany { return $this->hasMany(Demand::class); }
    public function events(): HasMany { return $this->hasMany(ClientEvent::class); }
    public function aiMemory(): HasMany { return $this->hasMany(ClientAiMemory::class); }
}

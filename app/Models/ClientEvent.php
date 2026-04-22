<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientEvent extends Model
{
    protected $fillable = ['client_id', 'title', 'date', 'recurrent', 'source'];
    protected $casts = ['date' => 'date', 'recurrent' => 'boolean'];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
}

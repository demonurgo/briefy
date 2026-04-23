<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'logo', 'settings',
        'anthropic_api_key_encrypted',
        'anthropic_key_valid',
        'anthropic_managed_agents_ok',
        'anthropic_key_checked_at',
        'client_research_agent_id',
        'client_research_environment_id',
    ];

    protected $casts = [
        'settings'                   => 'array',
        'anthropic_api_key_encrypted' => 'encrypted',    // Laravel native encrypted cast — uses APP_KEY
        'anthropic_key_valid'         => 'boolean',       // M3 — last testKey result
        'anthropic_managed_agents_ok' => 'boolean',       // M3 — last MA probe result
        'anthropic_key_checked_at'    => 'datetime',      // M3 — timestamp of last check
    ];

    protected $hidden = ['anthropic_api_key_encrypted']; // never serialized by toArray()/toJson()

    protected $appends = ['anthropic_api_key_mask'];     // L1: mask derived, NOT stored

    /**
     * Check whether this organization has an Anthropic API key configured.
     */
    public function hasAnthropicKey(): bool
    {
        return ! empty($this->anthropic_api_key_encrypted);
    }

    /**
     * Convenience accessor for server-side code — returns the decrypted API key.
     * The 'encrypted' cast on anthropic_api_key_encrypted handles decryption transparently.
     */
    public function getAnthropicApiKeyAttribute(): ?string
    {
        return $this->anthropic_api_key_encrypted;
    }

    /**
     * L1: Mask accessor — returns "sk-ant-...XXXX" (last 4 chars) or null. Derived; no DB column.
     */
    public function getAnthropicApiKeyMaskAttribute(): ?string
    {
        $key = $this->anthropic_api_key_encrypted;
        if (empty($key)) {
            return null;
        }
        $tail = substr($key, -4);
        return 'sk-ant-...' . $tail;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_user')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function demands(): HasMany
    {
        return $this->hasMany(Demand::class);
    }
}

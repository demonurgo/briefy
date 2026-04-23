<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password',
        'current_organization_id', 'role', 'preferences', 'last_login_at', 'avatar',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'preferences' => 'array',
        'password' => 'hashed',
    ];

    /**
     * The organization the user is currently working in (active context).
     * FK: current_organization_id — renamed from organization_id in Phase 4 migration.
     */
    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    /**
     * Backward-compat alias — any code using $user->organization still works.
     * Returns the same relation as currentOrganization().
     */
    public function organization(): BelongsTo
    {
        return $this->currentOrganization();
    }

    /**
     * All organizations this user belongs to (multi-org pivot).
     */
    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_user')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    /**
     * Get the user's role in their current organization from the pivot table.
     * Cached per-request on the model instance to avoid N+1 in middleware/guards.
     * Accessor: $user->current_role
     */
    public function getCurrentRoleAttribute(): ?string
    {
        if ($this->relationLoaded('organizations')) {
            return $this->organizations
                ->firstWhere('id', $this->current_organization_id)
                ?->pivot?->role;
        }

        return $this->organizations()
            ->wherePivot('organization_id', $this->current_organization_id)
            ->first()?->pivot?->role;
    }

    /**
     * Returns true if the user is the owner of their current organization.
     */
    public function isOwner(): bool
    {
        return $this->getCurrentRoleAttribute() === 'owner';
    }

    /**
     * Returns true if the user is an admin or owner in their current organization.
     */
    public function isAdminOrOwner(): bool
    {
        return in_array($this->getCurrentRoleAttribute(), ['owner', 'admin']);
    }

    /**
     * Backward-compat alias — any code using $user->isAdmin() still works.
     * Now delegates to isAdminOrOwner() so owner is also considered admin.
     */
    public function isAdmin(): bool
    {
        return $this->isAdminOrOwner();
    }

    public function getLocale(): string
    {
        return $this->preferences['locale'] ?? 'pt-BR';
    }

    public function getTheme(): string
    {
        return $this->preferences['theme'] ?? 'light';
    }
}

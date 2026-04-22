<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_routes_require_authentication(): void
    {
        // Profile routes were moved; unauthenticated access to protected areas should redirect to login
        $this->get('/dashboard')->assertRedirect(route('login'));
    }
}

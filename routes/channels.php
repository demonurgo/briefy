<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('organization.{orgId}', function ($user, $orgId) {
    return (int) $user->current_organization_id === (int) $orgId;
});

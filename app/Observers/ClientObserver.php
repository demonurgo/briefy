<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Client;

class ClientObserver
{
    public function created(Client $client): void
    {
        ActivityLog::create([
            'organization_id' => $client->organization_id,
            'user_id'         => auth()->id(),
            'action_type'     => 'client.created',
            'subject_type'    => 'client',
            'subject_id'      => $client->id,
            'subject_name'    => $client->name,
            'metadata'        => [],
        ]);
    }
}

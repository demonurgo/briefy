<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->organization_id;

        $planningReminderClients = Client::where('organization_id', $orgId)
            ->whereNotNull('planning_day')
            ->get(['id', 'name', 'planning_day']);

        return Inertia::render('Dashboard', [
            'stats'                   => [],
            'alerts'                  => [],
            'recentDemands'           => [],
            'clients'                 => [],
            'planningReminderClients' => $planningReminderClients,
        ]);
    }
}

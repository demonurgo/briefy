<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): \Inertia\Response
    {
        return \Inertia\Inertia::render('Dashboard', ['stats' => [], 'alerts' => [], 'recentDemands' => [], 'clients' => []]);
    }
}

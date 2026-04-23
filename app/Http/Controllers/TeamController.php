<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(): \Inertia\Response
    {
        return \Inertia\Inertia::render('Settings/Team', ['members' => []]);
    }
}

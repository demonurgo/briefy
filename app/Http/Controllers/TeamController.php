<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(): \Inertia\Response
    {
        return \Inertia\Inertia::render('Settings/Team', ['members' => []]);
    }
}

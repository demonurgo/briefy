<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PlanningController extends Controller
{
    public function index(): \Inertia\Response
    {
        return \Inertia\Inertia::render('Planning/Index', ['planningDemands' => []]);
    }
}

<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Models\ClientAiMemory;
use Illuminate\Http\RedirectResponse;

/**
 * Handles approve/dismiss actions for status='suggested' insights (D-38 / WARNING 7).
 * Low-confidence insights from the Managed Agent are persisted with status='suggested'
 * and surface in the ClientAiMemoryPanel's Sugestões tab for user review.
 */
class ClientAiMemoryController extends Controller
{
    /**
     * POST /client-ai-memory/{memory}/approve
     * Promote a suggested insight to active (user-confirmed signal).
     */
    public function approve(ClientAiMemory $memory): RedirectResponse
    {
        $this->authorizeMemory($memory);
        $memory->update(['status' => 'active']);
        return back()->with('success', __('app.memory_suggestion_approved'));
    }

    /**
     * POST /client-ai-memory/{memory}/dismiss
     * Dismiss a suggested insight (user rejected it).
     */
    public function dismiss(ClientAiMemory $memory): RedirectResponse
    {
        $this->authorizeMemory($memory);
        $memory->update(['status' => 'dismissed']);
        return back()->with('success', __('app.memory_suggestion_dismissed'));
    }

    /**
     * Org-scoping guard: ensures the memory entry belongs to the user's organization.
     * Cross-org access → 403 (T-03-112 boundary).
     */
    private function authorizeMemory(ClientAiMemory $memory): void
    {
        abort_if($memory->organization_id !== auth()->user()->organization_id, 403);
    }
}

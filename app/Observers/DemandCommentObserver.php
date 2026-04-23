<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\DemandComment;

class DemandCommentObserver
{
    public function created(DemandComment $comment): void
    {
        $demand = $comment->demand;
        if (! $demand) {
            return;
        }

        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => auth()->id() ?? $comment->user_id,
            'action_type'     => 'demand.comment_added',
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => [],
        ]);
    }
}

<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Observers;

use App\Events\DemandBoardUpdated;
use App\Models\ActivityLog;
use App\Models\Demand;

class DemandObserver
{
    public function created(Demand $demand): void
    {
        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => auth()->id() ?? $demand->created_by,
            'action_type'     => 'demand.created',
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => [],
        ]);

        DemandBoardUpdated::dispatch($demand->organization_id, 'created');
    }

    public function updated(Demand $demand): void
    {
        // Detectar mudança de status (priority: demand.status_changed)
        if ($demand->wasChanged('status')) {
            ActivityLog::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => auth()->id() ?? $demand->created_by,
                'action_type'     => 'demand.status_changed',
                'subject_type'    => 'demand',
                'subject_id'      => $demand->id,
                'subject_name'    => $demand->title,
                'metadata'        => [
                    'from' => $demand->getOriginal('status'),
                    'to'   => $demand->status,
                ],
            ]);
        }

        // Detectar mudança de responsável (assigned_to)
        if ($demand->wasChanged('assigned_to') && $demand->assigned_to !== null) {
            ActivityLog::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => auth()->id() ?? $demand->created_by,
                'action_type'     => 'demand.assigned',
                'subject_type'    => 'demand',
                'subject_id'      => $demand->id,
                'subject_name'    => $demand->title,
                'metadata'        => [
                    'assigned_to_id' => $demand->assigned_to,
                ],
            ]);
        }

        // PITFALL 3: archived_at != soft delete
        // archived_at setado = arquivamento manual (ArchiveController)
        // Usar wasChanged('archived_at') aqui, NÃO o deleted() hook
        if ($demand->wasChanged('archived_at') && $demand->archived_at !== null) {
            ActivityLog::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => auth()->id() ?? $demand->created_by,
                'action_type'     => 'demand.archived',
                'subject_type'    => 'demand',
                'subject_id'      => $demand->id,
                'subject_name'    => $demand->title,
                'metadata'        => [],
            ]);
        }

        DemandBoardUpdated::dispatch($demand->organization_id, 'updated');
    }

    public function deleted(Demand $demand): void
    {
        // Soft delete = movido para lixeira → também registra como archived
        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => auth()->id() ?? $demand->created_by,
            'action_type'     => 'demand.archived',
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => ['via' => 'trash'],
        ]);

        DemandBoardUpdated::dispatch($demand->organization_id, 'deleted');
    }

    public function restored(Demand $demand): void
    {
        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => auth()->id() ?? $demand->created_by,
            'action_type'     => 'demand.restored',
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => [],
        ]);

        DemandBoardUpdated::dispatch($demand->organization_id, 'restored');
    }
}

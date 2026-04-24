// (c) 2026 Briefy contributors — AGPL-3.0
import { formatDate } from '@/utils/date';
import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Archive, Calendar, Loader2, Trash2, User } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const STATUSES = ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'] as const;

function TrashZone({ visible }: { visible: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: '__trash__' });
  return (
    <div
      ref={setNodeRef}
      className={`absolute bottom-4 left-4 z-20 flex flex-col items-center justify-center gap-2 rounded-[16px] w-24 h-24 text-xs font-semibold shadow-xl transition-all duration-200 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      } ${
        isOver
          ? 'bg-red-500 text-white scale-110 shadow-red-300'
          : 'bg-red-50 border-2 border-dashed border-red-300 text-red-400 dark:bg-red-950/30 dark:border-red-700 dark:text-red-400'
      }`}
    >
      <Trash2 size={26} />
      <span>{isOver ? 'Soltar aqui' : 'Lixeira'}</span>
    </div>
  );
}

function ArchiveZone({ visible }: { visible: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: '__archive__' });
  return (
    <div
      ref={setNodeRef}
      className={`absolute bottom-4 right-4 z-20 flex flex-col items-center justify-center gap-2 rounded-[16px] w-24 h-24 text-xs font-semibold shadow-xl transition-all duration-200 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      } ${
        isOver
          ? 'bg-[#6b7280] text-white scale-110 shadow-gray-300'
          : 'bg-[#f9fafb] border-2 border-dashed border-[#d1d5db] text-[#9ca3af] dark:bg-[#1f2937] dark:border-[#374151] dark:text-[#6b7280]'
      }`}
    >
      <Archive size={26} />
      <span>{isOver ? 'Soltar aqui' : 'Arquivar'}</span>
    </div>
  );
}

const COLUMN_COLORS: Record<string, string> = {
  todo:               'border-t-[#9ca3af]',
  in_progress:        'border-t-[#3b82f6]',
  awaiting_feedback:  'border-t-[#f59e0b]',
  in_review:          'border-t-[#8b5cf6]',
  approved:           'border-t-[#10b981]',
};

interface Demand {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  client?: { name: string } | null;
  assignee?: { name: string } | null;
}

function DemandCard({ demand, isDragging = false, onDemandClick, loadingId }: { demand: Demand; isDragging?: boolean; onDemandClick?: (id: number) => void; loadingId?: number | null }) {
  const isLoading = loadingId === demand.id;
  return (
    <div
      onClick={() => !isDragging && onDemandClick?.(demand.id)}
      className={`relative rounded-[8px] bg-white p-3.5 shadow-sm dark:bg-[#111827] ${isDragging ? 'shadow-lg rotate-1 opacity-90' : 'hover:shadow-md'} transition-shadow ${!isDragging && onDemandClick ? 'cursor-pointer' : ''}`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[8px] bg-white/80 dark:bg-[#111827]/80">
          <Loader2 size={18} className="animate-spin text-[#7c3aed]" />
        </div>
      )}
      <p className="text-sm font-medium text-[#111827] dark:text-[#f9fafb] line-clamp-2">{demand.title}</p>
      {demand.client && (
        <p className="mt-1.5 text-xs text-[#9ca3af]">{demand.client.name}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        {demand.deadline && (
          <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
            <Calendar size={11} />
            {formatDate(demand.deadline)}
          </span>
        )}
        {demand.assignee && (
          <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
            <User size={11} />
            {demand.assignee.name.split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ demand, onDemandClick, loadingId }: { demand: Demand; onDemandClick?: (id: number) => void; loadingId?: number | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: demand.id,
    data: { demand },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <DemandCard demand={demand} onDemandClick={onDemandClick} loadingId={loadingId} />
    </div>
  );
}

function DroppableColumn({ status, demands, onDemandClick, loadingId }: { status: string; demands: Demand[]; onDemandClick?: (id: number) => void; loadingId?: number | null }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className={`rounded-t-[12px] border-t-4 bg-white px-4 py-3 dark:bg-[#111827] ${COLUMN_COLORS[status]}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
            {t(`demand.statuses.${status}`)}
          </span>
          <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#6b7280] dark:bg-[#1f2937]">
            {demands.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 overflow-y-auto rounded-b-[12px] p-3 min-h-32 transition-colors no-scrollbar ${
          isOver
            ? 'bg-[#7c3aed]/10 dark:bg-[#7c3aed]/10'
            : 'bg-[#f9fafb] dark:bg-[#0b0f14]'
        }`}
      >
        {demands.map(demand => (
          <DraggableCard key={demand.id} demand={demand} onDemandClick={onDemandClick} loadingId={loadingId} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ demands: initialDemands, onDemandClick, loadingDemandId }: { demands: Demand[]; onDemandClick?: (id: number) => void; loadingDemandId?: number | null }) {
  const [demands, setDemands] = useState(initialDemands);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (activeId === null) setDemands(initialDemands);
  }, [initialDemands]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const activeDemand = activeId ? demands.find(d => d.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as string;

    if (!STATUSES.includes(overId as typeof STATUSES[number])) return;

    setDemands(prev =>
      prev.map(d => d.id === activeId ? { ...d, status: overId } : d)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const demandId = active.id as number;
    const overId = over.id as string;

    // Dropped on trash zone
    if (overId === '__trash__') {
      setDemands(prev => prev.filter(d => d.id !== demandId));
      router.post(route('demands.trash', demandId), {}, { preserveScroll: true });
      return;
    }

    // Dropped on archive zone
    if (overId === '__archive__') {
      setDemands(prev => prev.filter(d => d.id !== demandId));
      router.post(route('demands.archive', demandId), {}, { preserveScroll: true });
      return;
    }

    if (!STATUSES.includes(overId as typeof STATUSES[number])) return;

    const original = initialDemands.find(d => d.id === demandId);
    if (original && original.status !== overId) {
      router.patch(route('demands.status.update', demandId), { status: overId }, { preserveScroll: true });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDemands(initialDemands);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex h-[calc(100dvh-8rem)] md:h-full gap-4 overflow-x-auto kanban-scroll pb-2">
          {STATUSES.map(status => (
            <DroppableColumn
              key={status}
              status={status}
              demands={demands.filter(d => d.status === status)}
              onDemandClick={onDemandClick}
              loadingId={loadingDemandId}
            />
          ))}
        </div>

        <TrashZone visible={activeId !== null} />
        <ArchiveZone visible={activeId !== null} />

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeDemand && <DemandCard demand={activeDemand} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

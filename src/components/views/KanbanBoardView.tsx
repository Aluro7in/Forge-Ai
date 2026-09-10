import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  GripVertical,
  Layers,
  Flag,
  Calendar,
  Sparkles,
  Play,
  Pause,
  Archive,
  ArchiveRestore,
  RotateCcw,
  Search,
  CheckCircle2,
  CheckSquare,
  Square,
  Maximize2,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus, TaskPriority, Milestone } from '../../types/forge';
import { DashboardSummary } from '../DashboardSummary';
import { TaskTimerTracker } from '../TaskTimerTracker';
import { TaskCardModal, PRIORITY_CONFIG, getDueDateAnalysis } from '../TaskCardModal';

export type SwimlaneMode = 'none' | 'phase' | 'urgency';

interface SwimlaneDef {
  id: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  filter: (task: Task) => boolean;
  targetPatch?: Partial<Task>;
  colorAccent?: string;
  defaultOpen?: boolean;
}

interface KanbanBoardViewProps {
  onOpenAnalytics?: () => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({ onOpenAnalytics }) => {
  const { tasks, setTasks, milestones, executeToolByName } = useWorkspace();

  // Active vs Archived Tasks Segregation
  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((t) => !!t.archived), [tasks]);

  // Swimlane View Mode State
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Record<string, boolean>>({});

  // Active Timer Tracker State (only one active timer at a time)
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);

  // Archive Drawer / Modal State
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [archivedSearchQuery, setArchivedSearchQuery] = useState('');
  const [isArchivingAll, setIsArchivingAll] = useState(false);

  // Task Card Detail & Subtask Modal State
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const selectedModalTask = useMemo(
    () => tasks.find((t) => t.id === modalTaskId) || null,
    [tasks, modalTaskId]
  );

  // Quick Task Creation State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('high');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Founder A (Tech)');
  const [newTaskEstimate, setNewTaskEstimate] = useState(1);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState<string>(milestones[0]?.id || '');

  // Inline Quick-Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    assignee: string;
    milestoneId: string;
    estimateDays: number;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    assignee: 'Founder A (Tech)',
    milestoneId: '',
    estimateDays: 1,
  });

  const inlineEditContainerRef = useRef<HTMLDivElement>(null);

  // Native Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    swimlaneId: string;
    colId: TaskStatus;
    index: number;
    position: 'top' | 'bottom';
  } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<{
    swimlaneId: string;
    colId: TaskStatus;
  } | null>(null);

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'border-slate-700' },
    { id: 'in_progress', title: 'In Progress', color: 'border-amber-500/70' },
    { id: 'review', title: 'Review / Gate', color: 'border-indigo-500/70' },
    { id: 'done', title: 'Completed', color: 'border-emerald-500/70' },
  ];

  // Build Swimlane Definitions based on current mode using active tasks
  const swimlanes: SwimlaneDef[] = useMemo(() => {
    if (swimlaneMode === 'phase') {
      const list: SwimlaneDef[] = milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        badge: (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold border border-blue-300 bg-blue-50 text-blue-800">
            <Calendar className="w-2.5 h-2.5" />
            <span>Target: {m.targetDate}</span>
          </span>
        ),
        filter: (task: Task) => task.milestoneId === m.id,
        targetPatch: { milestoneId: m.id },
        colorAccent: m.color || '#3B82F6',
      }));

      // Add Unassigned / General Tasks swimlane if there are unlinked tasks
      const unassignedTasks = activeTasks.filter(
        (t) => !t.milestoneId || !milestones.some((m) => m.id === t.milestoneId)
      );
      if (unassignedTasks.length > 0 || list.length === 0) {
        list.push({
          id: 'unassigned-phase',
          title: 'Unassigned / General Tasks',
          description: 'Backlog tasks not linked to a specific release milestone',
          badge: (
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-stone-500 bg-stone-100 border border-stone-200 font-bold">
              General Backlog
            </span>
          ),
          filter: (task: Task) => !task.milestoneId || !milestones.some((m) => m.id === task.milestoneId),
          targetPatch: { milestoneId: undefined },
          colorAccent: '#78716C',
        });
      }

      return list;
    }

    if (swimlaneMode === 'urgency') {
      return [
        {
          id: 'urgent',
          title: 'Urgent Priority',
          description: 'Critical path blockers and immediate launch gate items',
          badge: (
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-black text-white font-bold border border-black">
              Critical Urgency
            </span>
          ),
          filter: (task: Task) => task.priority === 'urgent',
          targetPatch: { priority: 'urgent' },
          colorAccent: '#000000',
        },
        {
          id: 'high',
          title: 'High Priority',
          description: 'Core launch deliverables and primary milestone dependencies',
          badge: (
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-stone-200 text-stone-900 border border-stone-400 font-bold">
              High Impact
            </span>
          ),
          filter: (task: Task) => task.priority === 'high',
          targetPatch: { priority: 'high' },
          colorAccent: '#F59E0B',
        },
        {
          id: 'medium',
          title: 'Medium Priority',
          description: 'Standard product engineering flow and feature requirements',
          badge: (
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-white text-stone-800 border border-stone-300 font-bold">
              Medium
            </span>
          ),
          filter: (task: Task) => task.priority === 'medium',
          targetPatch: { priority: 'medium' },
          colorAccent: '#64748B',
        },
        {
          id: 'low',
          title: 'Low Priority',
          description: 'Non-blocking polish, edge case enhancements, and secondary items',
          badge: (
            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-200 font-bold">
              Low
            </span>
          ),
          filter: (task: Task) => task.priority === 'low',
          targetPatch: { priority: 'low' },
          colorAccent: '#A8A29E',
        },
      ];
    }

    // Default: 'none' -> Single unified swimlane containing all active tasks
    return [
      {
        id: 'all',
        title: 'All Workspace Tasks',
        filter: () => true,
        defaultOpen: true,
      },
    ];
  }, [swimlaneMode, milestones, activeTasks]);

  const toggleSwimlaneCollapse = (swimlaneId: string) => {
    setCollapsedSwimlanes((prev) => ({
      ...prev,
      [swimlaneId]: !prev[swimlaneId],
    }));
  };

  const handleExpandAll = () => setCollapsedSwimlanes({});
  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    swimlanes.forEach((s) => {
      allCollapsed[s.id] = true;
    });
    setCollapsedSwimlanes(allCollapsed);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await executeToolByName('create_task', {
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      assignee: newTaskAssignee,
      estimateDays: Number(newTaskEstimate),
      milestoneId: newTaskMilestoneId || undefined,
      dueDate: newTaskDueDate || undefined,
      tags: ['HumanCreated'],
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  };

  // Task Details Modal Save Handler
  const handleSaveModalTask = async (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

    try {
      await executeToolByName('update_task', {
        taskId: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        assignee: updatedTask.assignee,
        milestoneId: updatedTask.milestoneId || undefined,
        estimateDays: updatedTask.estimateDays,
        dueDate: updatedTask.dueDate || undefined,
        subtasks: updatedTask.subtasks || [],
        archived: updatedTask.archived,
        archivedAt: updatedTask.archivedAt,
      });
    } catch (err) {
      console.error('Failed to update task via WebMCP:', err);
    }
  };

  // Quick Card Subtask Toggle Handler
  const handleToggleCardSubtask = async (
    e: React.MouseEvent,
    task: Task,
    subtaskId: string
  ) => {
    e.stopPropagation();
    const updatedSubtasks = (task.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));

    try {
      await executeToolByName('update_task', {
        taskId: task.id,
        subtasks: updatedSubtasks,
      });
    } catch (err) {
      console.error('Failed to update subtask via WebMCP:', err);
    }
  };

  const handleOpenAddInSwimlane = (swimlane: SwimlaneDef) => {
    if (swimlaneMode === 'phase' && swimlane.id !== 'unassigned-phase') {
      setNewTaskMilestoneId(swimlane.id);
    } else if (swimlaneMode === 'urgency') {
      setNewTaskPriority(swimlane.id as TaskPriority);
    }
    setIsAddingTask(true);
  };

  // Archive Task Handlers
  const handleArchiveTask = async (taskId: string) => {
    // If timer is running on this task, stop it
    if (activeTimerTaskId === taskId) {
      setActiveTimerTaskId(null);
    }
    await executeToolByName('archive_task', { taskId });
  };

  const handleRestoreTask = async (taskId: string) => {
    await executeToolByName('archive_task', { taskId, unarchive: true });
  };

  const handleArchiveAllDone = async (doneTasks: Task[]) => {
    if (doneTasks.length === 0) return;
    setIsArchivingAll(true);
    try {
      for (const t of doneTasks) {
        await executeToolByName('archive_task', { taskId: t.id });
      }
    } finally {
      setIsArchivingAll(false);
    }
  };

  const handleRestoreAllArchived = async () => {
    for (const t of archivedTasks) {
      await executeToolByName('archive_task', { taskId: t.id, unarchive: true });
    }
  };

  const handleStartInlineEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditValues({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee: task.assignee,
      milestoneId: task.milestoneId || '',
      estimateDays: task.estimateDays || 1,
    });
  };

  const handleCommitInlineEdit = async (taskId: string) => {
    const original = tasks.find((t) => t.id === taskId);
    if (!original) {
      setEditingTaskId(null);
      return;
    }

    const trimmedTitle = editValues.title.trim();
    if (!trimmedTitle) {
      setEditingTaskId(null);
      return;
    }

    const hasChanged =
      trimmedTitle !== original.title ||
      editValues.description.trim() !== (original.description || '') ||
      editValues.priority !== original.priority ||
      editValues.assignee !== original.assignee ||
      editValues.milestoneId !== (original.milestoneId || '') ||
      Number(editValues.estimateDays) !== original.estimateDays;

    if (!hasChanged) {
      setEditingTaskId(null);
      return;
    }

    setSavingTaskId(taskId);
    try {
      await executeToolByName('update_task', {
        taskId,
        title: trimmedTitle,
        description: editValues.description.trim(),
        priority: editValues.priority,
        assignee: editValues.assignee,
        milestoneId: editValues.milestoneId || undefined,
        estimateDays: Number(editValues.estimateDays),
      });
    } finally {
      setSavingTaskId(null);
      setEditingTaskId(null);
    }
  };

  const handleBlurContainer = (e: React.FocusEvent<HTMLDivElement>, taskId: string) => {
    if (inlineEditContainerRef.current && inlineEditContainerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    handleCommitInlineEdit(taskId);
  };

  const handleCancelInlineEdit = () => {
    setEditingTaskId(null);
  };

  const handleMoveTask = async (taskId: string, currentStatus: TaskStatus) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'review',
      review: 'done',
      done: 'todo',
    };
    const nextStatus = nextStatusMap[currentStatus];
    await executeToolByName('move_task', { taskId, newStatus: nextStatus });
  };

  const handleDeleteTask = async (taskId: string) => {
    await executeToolByName('delete_task', { taskId });
  };

  // Drag-and-Drop Event Handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    task: Task,
    swimlaneId: string,
    colId: TaskStatus,
    index: number
  ) => {
    if (editingTaskId) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ taskId: task.id, fromSwimlane: swimlaneId, fromCol: colId, fromIndex: index })
    );
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTarget(null);
    setDragOverColumn(null);
  };

  const handleCardDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    swimlaneId: string,
    colId: TaskStatus,
    cardIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const position: 'top' | 'bottom' = offsetY > rect.height / 2 ? 'bottom' : 'top';

    setDragOverTarget({ swimlaneId, colId, index: cardIndex, position });
    setDragOverColumn({ swimlaneId, colId });
  };

  const handleCardDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handleColumnDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    swimlaneId: string,
    colId: TaskStatus
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn({ swimlaneId, colId });
  };

  const handleColumnDragLeave = (
    e: React.DragEvent<HTMLDivElement>,
    swimlaneId: string,
    colId: TaskStatus
  ) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverColumn?.swimlaneId === swimlaneId && dragOverColumn?.colId === colId) {
        setDragOverColumn(null);
      }
    }
  };

  const executeTaskReorder = async (
    targetSwimlane: SwimlaneDef,
    targetColId: TaskStatus,
    targetIndex: number
  ) => {
    if (!draggedTaskId) return;

    const movingTask = tasks.find((t) => t.id === draggedTaskId);
    if (!movingTask) {
      handleDragEnd();
      return;
    }

    const droppedTaskId = draggedTaskId;
    handleDragEnd();

    // Determine target patch attributes if dropping into a specific swimlane
    const patch = targetSwimlane.targetPatch || {};

    const updatedTask: Task = {
      ...movingTask,
      status: targetColId,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update task order in local state for active tasks
    const withoutMoving = tasks.filter((t) => t.id !== droppedTaskId);
    const targetColTasksWithoutMoving = withoutMoving.filter((t) => {
      const matchesCol = t.status === targetColId;
      const matchesSwimlane = swimlaneMode !== 'none' ? targetSwimlane.filter(t) : true;
      return matchesCol && matchesSwimlane && !t.archived;
    });

    const safeTargetIndex = Math.max(0, Math.min(targetIndex, targetColTasksWithoutMoving.length));

    let newTasks: Task[];
    if (targetColTasksWithoutMoving.length === 0) {
      newTasks = [...withoutMoving, updatedTask];
    } else if (safeTargetIndex === 0) {
      const firstColTask = targetColTasksWithoutMoving[0];
      const insertPos = withoutMoving.findIndex((t) => t.id === firstColTask.id);
      newTasks = [
        ...withoutMoving.slice(0, insertPos),
        updatedTask,
        ...withoutMoving.slice(insertPos),
      ];
    } else if (safeTargetIndex >= targetColTasksWithoutMoving.length) {
      const lastColTask = targetColTasksWithoutMoving[targetColTasksWithoutMoving.length - 1];
      const insertPos = withoutMoving.findIndex((t) => t.id === lastColTask.id);
      newTasks = [
        ...withoutMoving.slice(0, insertPos + 1),
        updatedTask,
        ...withoutMoving.slice(insertPos + 1),
      ];
    } else {
      const refTask = targetColTasksWithoutMoving[safeTargetIndex];
      const insertPos = withoutMoving.findIndex((t) => t.id === refTask.id);
      newTasks = [
        ...withoutMoving.slice(0, insertPos),
        updatedTask,
        ...withoutMoving.slice(insertPos),
      ];
    }

    setTasks(newTasks);

    // Check if priority or milestone changed due to swimlane drop
    const priorityChanged = patch.priority && patch.priority !== movingTask.priority;
    const milestoneChanged =
      patch.milestoneId !== undefined && patch.milestoneId !== movingTask.milestoneId;

    try {
      if (priorityChanged || milestoneChanged) {
        await executeToolByName('update_task', {
          taskId: droppedTaskId,
          status: targetColId,
          ...(priorityChanged ? { priority: patch.priority } : {}),
          ...(milestoneChanged ? { milestoneId: patch.milestoneId } : {}),
        });
      } else {
        await executeToolByName('reorder_tasks', {
          taskId: droppedTaskId,
          targetStatus: targetColId,
          targetIndex: safeTargetIndex,
        });
      }
    } catch (err) {
      console.error('Failed to persist task reorder via WebMCP:', err);
    }
  };

  const handleCardDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetSwimlane: SwimlaneDef,
    colId: TaskStatus,
    cardIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const isBottom = offsetY > rect.height / 2;
    const targetIndex = isBottom ? cardIndex + 1 : cardIndex;

    executeTaskReorder(targetSwimlane, colId, targetIndex);
  };

  const handleColumnDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetSwimlane: SwimlaneDef,
    colId: TaskStatus
  ) => {
    e.preventDefault();
    const colTasksWithoutMoving = tasks.filter((t) => {
      const matchesCol = t.status === colId;
      const matchesSwimlane = swimlaneMode !== 'none' ? targetSwimlane.filter(t) : true;
      return matchesCol && matchesSwimlane && !t.archived && t.id !== draggedTaskId;
    });
    executeTaskReorder(targetSwimlane, colId, colTasksWithoutMoving.length);
  };

  const renderPriorityBadge = (p: TaskPriority) => {
    const config = PRIORITY_CONFIG[p] || PRIORITY_CONFIG.medium;
    return (
      <span
        className={`inline-flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono border ${config.badgeClass}`}
        title={`Priority: ${config.label} - ${config.description}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
        <span>{config.label}</span>
      </span>
    );
  };

  const formatTotalHours = (sec: number) => {
    const h = Math.round((sec / 3600) * 10) / 10;
    return `${h}h`;
  };

  const filteredArchivedTasks = useMemo(() => {
    const query = archivedSearchQuery.toLowerCase().trim();
    if (!query) return archivedTasks;
    return archivedTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        t.assignee.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
    );
  }, [archivedTasks, archivedSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black tracking-tight mb-1">
            Hero Roadmap
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            Active Workspace • {activeTasks.length} Active Tasks
            {archivedTasks.length > 0 && ` • ${archivedTasks.length} Archived`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Swimlane Grouping Segmented Selector */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 border border-stone-300">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider px-2 py-0.5 hidden md:inline">
              Swimlanes:
            </span>
            <button
              type="button"
              onClick={() => setSwimlaneMode('none')}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                swimlaneMode === 'none'
                  ? 'bg-black text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-black hover:bg-stone-200/70'
              }`}
              title="Standard Kanban columns with all active tasks"
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setSwimlaneMode('phase')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                swimlaneMode === 'phase'
                  ? 'bg-black text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-black hover:bg-stone-200/70'
              }`}
              title="Group tasks horizontally by Project Phase (Milestones)"
            >
              <Calendar className="w-3 h-3" />
              <span>Project Phase</span>
            </button>
            <button
              type="button"
              onClick={() => setSwimlaneMode('urgency')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                swimlaneMode === 'urgency'
                  ? 'bg-black text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-black hover:bg-stone-200/70'
              }`}
              title="Group tasks horizontally by Urgency Level (Urgent, High, Medium, Low)"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Urgency Level</span>
            </button>
          </div>

          {/* Archived Tasks Drawer/Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsArchivedModalOpen(true)}
            className={`flex items-center space-x-1.5 px-3 py-2 border text-[10px] uppercase font-bold tracking-wider transition shrink-0 ${
              archivedTasks.length > 0
                ? 'border-stone-400 bg-stone-100 hover:bg-stone-200 text-stone-900 shadow-2xs'
                : 'border-stone-200 bg-white text-stone-400 hover:text-stone-700'
            }`}
            title="View tasks stored in the archive state"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({archivedTasks.length})</span>
          </button>

          {/* New Task Button */}
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Dashboard Progress & Completion Metrics Visualizer */}
      <DashboardSummary onOpenAnalytics={onOpenAnalytics} />

      {/* Swimlane Global Collapse / Expand Controls when active */}
      {swimlaneMode !== 'none' && (
        <div className="flex items-center justify-between text-xs font-mono bg-stone-50 border border-stone-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-black uppercase tracking-wider">
              {swimlaneMode === 'phase' ? 'Grouped by Project Phase' : 'Grouped by Urgency Level'}
            </span>
            <span className="text-stone-400 text-[10px]">
              ({swimlanes.length} horizontal swimlanes)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] text-stone-600">
            <button
              type="button"
              onClick={handleExpandAll}
              className="hover:text-black hover:underline"
            >
              Expand All
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="hover:text-black hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Add Task Quick Form */}
      {isAddingTask && (
        <form
          onSubmit={handleCreateTask}
          className="bg-[#FCFAF7] border border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between text-xs text-black font-bold uppercase tracking-wider font-mono">
            <span>Create New Task (Executes WebMCP tool)</span>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="text-stone-400 hover:text-black font-mono"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="sm:col-span-3 bg-white border border-stone-300 rounded-none px-3 py-2 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
              autoFocus
            />

            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="sm:col-span-2 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black uppercase font-mono text-[11px]"
            >
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">⚪ Low</option>
            </select>

            <select
              value={newTaskMilestoneId}
              onChange={(e) => setNewTaskMilestoneId(e.target.value)}
              className="sm:col-span-2 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-sans text-[11px]"
            >
              <option value="">Unassigned Phase</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>

            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="sm:col-span-2 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-sans"
            >
              <option value="Founder A (Tech)">Founder A (Tech)</option>
              <option value="Founder B (Product)">Founder B (Product)</option>
              <option value="Forge Agent">Forge Agent</option>
            </select>

            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="sm:col-span-2 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-mono text-[11px]"
              title="Target Due Date"
            />

            <input
              type="number"
              step="0.5"
              min="0.5"
              max="14"
              value={newTaskEstimate}
              onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
              className="sm:col-span-1 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-mono"
              placeholder="Days"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="px-3.5 py-1.5 border border-stone-300 hover:border-black text-[10px] uppercase font-bold text-stone-600 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board Container (Swimlanes or Standard View) */}
      <div className="space-y-6">
        {swimlanes.map((swimlane) => {
          const swimlaneTasks = activeTasks.filter(swimlane.filter);
          const isCollapsed = collapsedSwimlanes[swimlane.id];
          const swimlaneDays = swimlaneTasks.reduce((acc, t) => acc + (t.estimateDays || 0), 0);
          const swimlaneTimeLoggedSec = swimlaneTasks.reduce(
            (acc, t) => acc + (t.timeSpentSeconds || 0),
            0
          );
          const swimlaneDoneCount = swimlaneTasks.filter((t) => t.status === 'done').length;

          return (
            <div
              key={swimlane.id}
              className={`border transition-all ${
                swimlaneMode !== 'none'
                  ? 'border-stone-300 bg-white shadow-xs'
                  : 'border-transparent'
              }`}
            >
              {/* Swimlane Horizontal Header (Shown when grouped) */}
              {swimlaneMode !== 'none' && (
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-stone-200 bg-stone-100/70 hover:bg-stone-100 transition cursor-pointer select-none`}
                  onClick={() => toggleSwimlaneCollapse(swimlane.id)}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <button
                      type="button"
                      className="p-1 hover:bg-white text-stone-600 hover:text-black transition border border-transparent hover:border-stone-300"
                      title={isCollapsed ? 'Expand swimlane' : 'Collapse swimlane'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {swimlane.colorAccent && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: swimlane.colorAccent }}
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-serif italic font-bold text-base text-black tracking-tight">
                          {swimlane.title}
                        </span>
                        {swimlane.badge}
                      </div>
                      {swimlane.description && !isCollapsed && (
                        <p className="text-[11px] text-stone-500 font-sans truncate">
                          {swimlane.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center space-x-3 text-xs font-mono shrink-0 pl-7 sm:pl-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-stone-700 bg-white border border-stone-200 px-2 py-0.5 text-[10px]">
                      {swimlaneTasks.length} {swimlaneTasks.length === 1 ? 'task' : 'tasks'} (
                      {swimlaneDoneCount} done)
                    </span>
                    <span className="text-stone-500 text-[10px]">
                      {swimlaneDays}d est.
                    </span>
                    {swimlaneTimeLoggedSec > 0 && (
                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold">
                        ⏱ {formatTotalHours(swimlaneTimeLoggedSec)} logged
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenAddInSwimlane(swimlane)}
                      className="px-2 py-0.5 bg-black hover:bg-stone-800 text-white text-[9px] uppercase font-bold tracking-wider transition"
                      title="Add task directly in this swimlane"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {/* Swimlane Columns Content */}
              {!isCollapsed && (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${swimlaneMode !== 'none' ? 'p-4 bg-stone-50/40' : ''}`}>
                  {columns.map((col) => {
                    const colTasks = swimlaneTasks.filter((t) => t.status === col.id);
                    const isOverColumn =
                      dragOverColumn?.swimlaneId === swimlane.id && dragOverColumn?.colId === col.id;

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => handleColumnDragOver(e, swimlane.id, col.id)}
                        onDragLeave={(e) => handleColumnDragLeave(e, swimlane.id, col.id)}
                        onDrop={(e) => handleColumnDrop(e, swimlane, col.id)}
                        className={`border p-3.5 flex flex-col transition-colors duration-150 ${
                          swimlaneMode === 'none' ? 'min-h-[500px]' : 'min-h-[170px]'
                        } ${
                          isOverColumn
                            ? 'bg-stone-100/90 border-black ring-1 ring-black/30'
                            : 'bg-stone-50/70 border-stone-200'
                        }`}
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-200">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-[11px] text-stone-800 uppercase tracking-widest">
                              {col.title}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              ({String(colTasks.length).padStart(2, '0')})
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Quick Archive All Completed Button in Done Column Header */}
                            {col.id === 'done' && colTasks.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveAllDone(colTasks);
                                }}
                                disabled={isArchivingAll}
                                className="flex items-center space-x-1 px-1.5 py-0.5 bg-stone-200 hover:bg-black hover:text-white text-stone-700 text-[9px] font-mono uppercase font-bold tracking-wider transition border border-stone-300"
                                title="Archive all completed tasks in this view to keep board tidy"
                              >
                                {isArchivingAll ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Archive className="w-2.5 h-2.5" />
                                )}
                                <span>Archive All</span>
                              </button>
                            )}

                            <span className="text-[9px] font-mono text-stone-400">
                              {colTasks.reduce((acc, t) => acc + (t.estimateDays || 0), 0)}d
                            </span>
                          </div>
                        </div>

                        {/* Task List Inside Column */}
                        <div className="space-y-3 flex-1">
                          {colTasks.length === 0 ? (
                            <div
                              onDragOver={(e) => handleColumnDragOver(e, swimlane.id, col.id)}
                              onDrop={(e) => handleColumnDrop(e, swimlane, col.id)}
                              className={`h-24 border border-dashed flex flex-col items-center justify-center p-2 text-center transition ${
                                isOverColumn
                                  ? 'border-black bg-stone-200/80 text-black'
                                  : 'border-stone-300 text-stone-400'
                              }`}
                            >
                              <p className="text-[10px] font-mono uppercase tracking-wider">
                                {isOverColumn ? 'Drop task here' : 'Empty'}
                              </p>
                            </div>
                          ) : (
                            colTasks.map((task, taskIndex) => {
                              const isEditing = editingTaskId === task.id;
                              const isSaving = savingTaskId === task.id;

                              if (isEditing) {
                                return (
                                  <div
                                    key={task.id}
                                    ref={inlineEditContainerRef}
                                    onBlur={(e) => handleBlurContainer(e, task.id)}
                                    className="p-3.5 bg-white border-2 border-black space-y-2.5 shadow-sm ring-2 ring-black/10"
                                  >
                                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                                      <span className="font-bold uppercase tracking-wider text-black">
                                        Quick Edit ({task.id})
                                      </span>
                                      {isSaving ? (
                                        <span className="flex items-center space-x-1 text-[9px] font-mono text-amber-600 font-bold">
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          <span>Updating...</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleCancelInlineEdit();
                                          }}
                                          className="text-stone-400 hover:text-black font-mono text-xs"
                                          title="Cancel (Esc)"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Inline Title Input */}
                                    <div className="space-y-1">
                                      <label className="text-[9px] uppercase tracking-wider font-mono text-stone-400 font-bold block">
                                        Task Title
                                      </label>
                                      <input
                                        type="text"
                                        value={editValues.title}
                                        onChange={(e) =>
                                          setEditValues({ ...editValues, title: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCommitInlineEdit(task.id);
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleCancelInlineEdit();
                                          }
                                        }}
                                        className="w-full bg-stone-50 border border-stone-300 px-2 py-1.5 text-xs text-black font-medium focus:outline-hidden focus:border-black font-sans"
                                        autoFocus
                                        placeholder="Task title..."
                                      />
                                    </div>

                                    {/* Inline Description Input */}
                                    <div className="space-y-1">
                                      <label className="text-[9px] uppercase tracking-wider font-mono text-stone-400 font-bold block">
                                        Description / Spec
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={editValues.description}
                                        onChange={(e) =>
                                          setEditValues({ ...editValues, description: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleCancelInlineEdit();
                                          }
                                        }}
                                        className="w-full bg-stone-50 border border-stone-300 px-2 py-1 text-xs text-stone-800 font-serif italic focus:outline-hidden focus:border-black"
                                        placeholder="Optional task notes..."
                                      />
                                    </div>

                                    {/* Inline Attributes Row */}
                                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                                      <div>
                                        <label className="text-[8px] uppercase tracking-wider font-mono text-stone-400 block">
                                          Priority
                                        </label>
                                        <select
                                          value={editValues.priority}
                                          onChange={(e) =>
                                            setEditValues({
                                              ...editValues,
                                              priority: e.target.value as TaskPriority,
                                            })
                                          }
                                          className="w-full bg-stone-50 border border-stone-300 p-1 text-[10px] font-mono uppercase focus:outline-hidden focus:border-black"
                                        >
                                          <option value="urgent">Urgent</option>
                                          <option value="high">High</option>
                                          <option value="medium">Medium</option>
                                          <option value="low">Low</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="text-[8px] uppercase tracking-wider font-mono text-stone-400 block">
                                          Days
                                        </label>
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0.5"
                                          max="14"
                                          value={editValues.estimateDays}
                                          onChange={(e) =>
                                            setEditValues({
                                              ...editValues,
                                              estimateDays: Number(e.target.value),
                                            })
                                          }
                                          className="w-full bg-stone-50 border border-stone-300 p-1 text-[10px] font-mono focus:outline-hidden focus:border-black"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[8px] uppercase tracking-wider font-mono text-stone-400 block">
                                          Assignee
                                        </label>
                                        <select
                                          value={editValues.assignee}
                                          onChange={(e) =>
                                            setEditValues({ ...editValues, assignee: e.target.value })
                                          }
                                          className="w-full bg-stone-50 border border-stone-300 p-1 text-[10px] truncate focus:outline-hidden focus:border-black"
                                        >
                                          <option value="Founder A (Tech)">Founder A</option>
                                          <option value="Founder B (Product)">Founder B</option>
                                          <option value="Forge Agent">Forge Agent</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 text-[9px] text-stone-400 font-mono">
                                      <span>Saves on blur via WebMCP</span>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleCommitInlineEdit(task.id);
                                        }}
                                        className="px-2 py-0.5 bg-black text-white hover:bg-stone-800 font-bold uppercase tracking-wider flex items-center space-x-1 shadow-2xs"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Save</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              const isBeingDragged = draggedTaskId === task.id;
                              const isTargetTop =
                                dragOverTarget?.swimlaneId === swimlane.id &&
                                dragOverTarget?.colId === col.id &&
                                dragOverTarget?.index === taskIndex &&
                                dragOverTarget?.position === 'top';
                              const isTargetBottom =
                                dragOverTarget?.swimlaneId === swimlane.id &&
                                dragOverTarget?.colId === col.id &&
                                dragOverTarget?.index === taskIndex &&
                                dragOverTarget?.position === 'bottom';

                              // Find task milestone label if in urgency/none mode
                              const milestoneObj = task.milestoneId
                                ? milestones.find((m) => m.id === task.milestoneId)
                                : null;

                              return (
                                <React.Fragment key={task.id}>
                                  {isTargetTop && (
                                    <div className="h-1.5 bg-black rounded-full my-1 animate-pulse shadow-xs" />
                                  )}
                                  <motion.div
                                    layout
                                    whileHover={
                                      !isEditing
                                        ? {
                                            y: -2,
                                            scale: 1.012,
                                            transition: { duration: 0.15, ease: 'easeOut' },
                                          }
                                        : undefined
                                    }
                                    whileTap={!isEditing ? { scale: 0.995 } : undefined}
                                    draggable={!isEditing}
                                    onDoubleClick={() => setModalTaskId(task.id)}
                                    onDragStart={(e) =>
                                      handleDragStart(
                                        e as unknown as React.DragEvent<HTMLDivElement>,
                                        task,
                                        swimlane.id,
                                        col.id,
                                        taskIndex
                                      )
                                    }
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) =>
                                      handleCardDragOver(
                                        e as unknown as React.DragEvent<HTMLDivElement>,
                                        swimlane.id,
                                        col.id,
                                        taskIndex
                                      )
                                    }
                                    onDragLeave={handleCardDragLeave}
                                    onDrop={(e) =>
                                      handleCardDrop(
                                        e as unknown as React.DragEvent<HTMLDivElement>,
                                        swimlane,
                                        col.id,
                                        taskIndex
                                      )
                                    }
                                    className={`p-4 border space-y-2.5 transition-shadow duration-200 group relative ${
                                      isBeingDragged
                                        ? 'opacity-40 border-dashed border-black bg-stone-100 scale-[0.98]'
                                        : 'bg-[#FCFAF7] border-stone-200 hover:border-black hover:shadow-md shadow-xs'
                                    } ${
                                      task.priority === 'urgent'
                                        ? 'border-l-4 border-l-red-500'
                                        : task.priority === 'high'
                                        ? 'border-l-4 border-l-amber-500'
                                        : task.priority === 'medium'
                                        ? 'border-l-4 border-l-blue-500'
                                        : 'border-l-4 border-l-slate-300'
                                    } ${!isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center space-x-1.5 min-w-0">
                                        <div
                                          className="text-stone-400 hover:text-black cursor-grab active:cursor-grabbing p-0.5 -ml-1 transition shrink-0"
                                          title="Drag to reorder within column or across swimlanes"
                                        >
                                          <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider truncate">
                                          {task.id.toUpperCase()}
                                        </span>
                                      </div>
                                      <div
                                        className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition"
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        {/* Modal Details & Date Picker / Subtasks */}
                                        <button
                                          type="button"
                                          onClick={() => setModalTaskId(task.id)}
                                          className="text-stone-400 hover:text-black transition p-1 bg-white border border-stone-200 hover:border-black"
                                          title="Open task modal with date picker & subtask checklist"
                                        >
                                          <Maximize2 className="w-3 h-3" />
                                        </button>

                                        {/* Quick Archive button on hover */}
                                        <button
                                          type="button"
                                          onClick={() => handleArchiveTask(task.id)}
                                          className="text-stone-400 hover:text-black transition p-1 bg-white border border-stone-200 hover:border-black"
                                          title="Archive task to keep workspace tidy"
                                        >
                                          <Archive className="w-3 h-3" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleStartInlineEdit(task)}
                                          className="text-stone-400 hover:text-black transition p-1 bg-white border border-stone-200 hover:border-black"
                                          title="Quick edit task inline"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="text-stone-400 hover:text-black transition p-1 bg-white border border-stone-200 hover:border-black"
                                          title="Delete task (WebMCP delete_task)"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Title with click-to-open cursor */}
                                    <h4
                                      onClick={() => setModalTaskId(task.id)}
                                      className="text-sm font-medium leading-snug text-black cursor-pointer hover:underline decoration-stone-400 underline-offset-2"
                                      title="Click to open task details and subtask manager"
                                    >
                                      {task.title}
                                    </h4>

                                    {task.description && (
                                      <p
                                        onClick={() => setModalTaskId(task.id)}
                                        className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed font-serif italic cursor-pointer"
                                        title="Click to open task details"
                                      >
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Due Date Warning Badge (Overdue, Due Today, Approaching, Future) */}
                                    {task.dueDate && (() => {
                                      const dateAnalysis = getDueDateAnalysis(task.dueDate, task.status === 'done');
                                      if (!dateAnalysis) return null;
                                      const DateIcon = dateAnalysis.icon;
                                      return (
                                        <div className="pt-0.5 flex items-center space-x-1.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setModalTaskId(task.id);
                                            }}
                                            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider border transition hover:opacity-85 ${dateAnalysis.badgeClass}`}
                                            title={`${dateAnalysis.urgencyMessage || dateAnalysis.label} (Click to open date picker)`}
                                          >
                                            <DateIcon className="w-3 h-3 shrink-0" />
                                            <span>{dateAnalysis.label}</span>
                                            {dateAnalysis.isWarning && task.status !== 'done' && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping ml-0.5" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })()}

                                    {/* Milestone tag badge if in non-phase mode */}
                                    {swimlaneMode !== 'phase' && milestoneObj && (
                                      <div className="pt-0.5">
                                        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 truncate max-w-full">
                                          {milestoneObj.title.replace('Milestone ', 'M')}
                                        </span>
                                      </div>
                                    )}

                                    {/* Subtasks Progress & Checklist on Card */}
                                    {task.subtasks && task.subtasks.length > 0 && (() => {
                                      const total = task.subtasks.length;
                                      const completed = task.subtasks.filter((s) => s.completed).length;
                                      const percent = Math.round((completed / total) * 100);
                                      return (
                                        <div className="pt-1.5 space-y-1.5 border-t border-stone-200/70">
                                          <div className="flex items-center justify-between text-[9px] font-mono">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setModalTaskId(task.id);
                                              }}
                                              className="flex items-center space-x-1 text-stone-600 hover:text-black transition"
                                              title="Click to manage subtasks in modal"
                                            >
                                              <CheckSquare className="w-3 h-3 text-stone-500" />
                                              <span className="font-bold uppercase tracking-wider">Subtasks:</span>
                                              <span>{completed}/{total}</span>
                                            </button>
                                            <span
                                              className={`font-bold ${
                                                percent === 100 ? 'text-emerald-700' : 'text-stone-600'
                                              }`}
                                            >
                                              {percent}%
                                            </span>
                                          </div>

                                          {/* Mini Progress Bar */}
                                          <div className="w-full bg-stone-200 h-1 overflow-hidden border border-stone-300">
                                            <div
                                              className={`h-full transition-all duration-300 ${
                                                percent === 100 ? 'bg-emerald-600' : percent > 50 ? 'bg-black' : 'bg-stone-700'
                                              }`}
                                              style={{ width: `${percent}%` }}
                                            />
                                          </div>

                                          {/* Interactive mini checklist with direct toggle */}
                                          <div className="space-y-1 pt-0.5">
                                            {task.subtasks.slice(0, 3).map((sub) => (
                                              <div
                                                key={sub.id}
                                                onClick={(e) => handleToggleCardSubtask(e, task, sub.id)}
                                                className="flex items-center space-x-1.5 text-[10px] text-stone-700 hover:text-black cursor-pointer group/sub py-0.5 select-none"
                                                title={sub.completed ? 'Click to mark incomplete' : 'Click to mark complete'}
                                              >
                                                {sub.completed ? (
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                ) : (
                                                  <Square className="w-3 h-3 text-stone-400 group-hover/sub:text-black shrink-0" />
                                                )}
                                                <span
                                                  className={`truncate font-sans ${
                                                    sub.completed ? 'line-through text-stone-400' : 'text-stone-800'
                                                  }`}
                                                >
                                                  {sub.title}
                                                </span>
                                              </div>
                                            ))}
                                            {task.subtasks.length > 3 && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setModalTaskId(task.id);
                                                }}
                                                className="text-[9px] font-mono text-stone-500 hover:text-black italic pl-4"
                                              >
                                                +{task.subtasks.length - 3} more checklist items...
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-200">
                                      <div className="italic truncate pr-2">
                                        Assigned:{' '}
                                        <span className="font-sans not-italic text-stone-700 font-medium">
                                          {task.assignee}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2 shrink-0">
                                        {task.comments && task.comments.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setModalTaskId(task.id);
                                            }}
                                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-[9px] font-mono transition"
                                            title={`${task.comments.length} note(s) / update(s) (Click to view)`}
                                          >
                                            <MessageSquare className="w-2.5 h-2.5 text-stone-500" />
                                            <span>{task.comments.length}</span>
                                          </button>
                                        )}
                                        <div className="font-mono text-stone-800 font-medium shrink-0">
                                          {task.estimateDays}d
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                      {renderPriorityBadge(task.priority)}

                                      <div className="flex items-center space-x-1.5">
                                        {/* Prominent Archive Action on Completed Tasks */}
                                        {task.status === 'done' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleArchiveTask(task.id);
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="flex items-center space-x-1 px-2 py-0.5 bg-stone-200 hover:bg-black hover:text-white text-stone-800 text-[10px] font-mono uppercase font-bold tracking-wider transition border border-stone-300"
                                            title="Archive completed task (removes from active board to keep workspace tidy)"
                                          >
                                            <Archive className="w-3 h-3" />
                                            <span>Archive</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveTask(task.id, task.status);
                                          }}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          className="flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider text-stone-600 hover:text-black transition"
                                          title="Advance task to next column status"
                                        >
                                          <span>Advance</span>
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Task Time Tracker Component */}
                                    <TaskTimerTracker
                                      task={task}
                                      activeTimerTaskId={activeTimerTaskId}
                                      onTimerStart={(id) => setActiveTimerTaskId(id)}
                                      onTimerStop={() => setActiveTimerTaskId(null)}
                                    />
                                  </motion.div>
                                  {isTargetBottom && (
                                    <div className="h-1.5 bg-black rounded-full my-1 animate-pulse shadow-xs" />
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}

                          {/* Drop zone at the bottom of the column */}
                          {colTasks.length > 0 && (
                            <div
                              onDragOver={(e) => handleColumnDragOver(e, swimlane.id, col.id)}
                              onDrop={(e) => handleColumnDrop(e, swimlane, col.id)}
                              className={`h-7 border border-dashed rounded-none transition flex items-center justify-center text-[9px] font-mono uppercase tracking-wider ${
                                isOverColumn && dragOverTarget === null
                                  ? 'border-black bg-stone-200/70 text-black font-bold'
                                  : 'border-transparent text-transparent hover:border-stone-300 hover:text-stone-400'
                              }`}
                            >
                              + Drop at bottom of {col.title}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Archived Tasks Modal / Drawer */}
      {isArchivedModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsArchivedModalOpen(false)}
        >
          <div
            className="bg-white border-2 border-black max-w-2xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,0.25)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-black bg-stone-50 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Archive className="w-5 h-5 text-black" />
                  <h3 className="font-serif italic text-xl sm:text-2xl font-bold text-black tracking-tight">
                    Archived Workspace Tasks
                  </h3>
                  <span className="px-2 py-0.5 bg-black text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                    {archivedTasks.length} {archivedTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 font-sans">
                  Completed tasks removed from active board view to keep your workspace tidy. You can restore them to the board anytime.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsArchivedModalOpen(false)}
                className="text-stone-400 hover:text-black transition p-1 font-mono text-base"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Search & Filter Bar */}
            <div className="p-3 border-b border-stone-200 bg-white flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={archivedSearchQuery}
                  onChange={(e) => setArchivedSearchQuery(e.target.value)}
                  placeholder="Search archived tasks by title, assignee, or ID..."
                  className="w-full bg-stone-50 border border-stone-200 pl-8 pr-3 py-1.5 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
                />
              </div>

              {archivedTasks.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreAllArchived}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-black border border-stone-300 text-[10px] uppercase font-bold tracking-wider transition shrink-0"
                  title="Restore all archived tasks back to the active board"
                >
                  <ArchiveRestore className="w-3 h-3" />
                  <span>Restore All</span>
                </button>
              )}
            </div>

            {/* Modal List Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-stone-50/50">
              {filteredArchivedTasks.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Archive className="w-10 h-10 text-stone-300 mx-auto stroke-1" />
                  <p className="text-xs font-mono uppercase tracking-wider text-stone-500 font-bold">
                    {archivedSearchQuery
                      ? 'No archived tasks matched your search.'
                      : 'No tasks currently archived.'}
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-sm mx-auto font-sans">
                    When you complete tasks on the active roadmap, use the "Archive" action on any task card to store them here and keep the active board clutter-free.
                  </p>
                </div>
              ) : (
                filteredArchivedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-white border border-stone-200 hover:border-black transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">
                          {task.id}
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Done</span>
                        </span>
                        {renderPriorityBadge(task.priority)}
                        {task.archivedAt && (
                          <span className="text-[9px] font-mono text-stone-400">
                            Archived: {new Date(task.archivedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-medium text-stone-900 truncate">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-1 font-serif italic">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-3 text-[10px] text-stone-500 font-mono pt-1">
                        <span>Assigned: {task.assignee}</span>
                        <span>•</span>
                        <span>{task.estimateDays}d estimate</span>
                        {task.timeSpentSeconds ? (
                          <>
                            <span>•</span>
                            <span className="text-amber-800 font-bold">
                              ⏱ {formatTotalHours(task.timeSpentSeconds)} logged
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <button
                        type="button"
                        onClick={() => handleRestoreTask(task.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-2xs"
                        title="Restore task back to the active board"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Restore to Board</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-stone-400 hover:text-black hover:bg-stone-100 border border-stone-200 transition"
                        title="Delete task permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-stone-200 bg-white flex items-center justify-between text-xs text-stone-500 font-mono">
              <span>{filteredArchivedTasks.length} shown</span>
              <button
                type="button"
                onClick={() => setIsArchivedModalOpen(false)}
                className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold uppercase text-[10px] tracking-wider transition border border-stone-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details & Subtask Checklist Modal */}
      <TaskCardModal
        task={selectedModalTask}
        isOpen={!!selectedModalTask}
        onClose={() => setModalTaskId(null)}
        onSave={handleSaveModalTask}
        onDelete={handleDeleteTask}
        onArchiveToggle={(t) => handleArchiveTask(t.id)}
        milestones={milestones}
      />
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  Plus,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Zap,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus, TaskPriority } from '../../types/forge';
import { DashboardSummary } from '../DashboardSummary';

interface KanbanBoardViewProps {
  onOpenAnalytics?: () => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({ onOpenAnalytics }) => {
  const { tasks, executeToolByName } = useWorkspace();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('high');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Founder A (Tech)');
  const [newTaskEstimate, setNewTaskEstimate] = useState(1);

  // Inline Quick-Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    assignee: string;
    estimateDays: number;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    assignee: 'Founder A (Tech)',
    estimateDays: 1,
  });

  const inlineEditContainerRef = useRef<HTMLDivElement>(null);

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'border-slate-700' },
    { id: 'in_progress', title: 'In Progress', color: 'border-amber-500/70' },
    { id: 'review', title: 'Review / Gate', color: 'border-indigo-500/70' },
    { id: 'done', title: 'Completed', color: 'border-emerald-500/70' },
  ];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await executeToolByName('create_task', {
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      assignee: newTaskAssignee,
      estimateDays: Number(newTaskEstimate),
      tags: ['HumanCreated'],
    });

    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleStartInlineEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditValues({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee: task.assignee,
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
      // Revert if title is emptied
      setEditingTaskId(null);
      return;
    }

    const hasChanged =
      trimmedTitle !== original.title ||
      editValues.description.trim() !== (original.description || '') ||
      editValues.priority !== original.priority ||
      editValues.assignee !== original.assignee ||
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
        estimateDays: Number(editValues.estimateDays),
      });
    } finally {
      setSavingTaskId(null);
      setEditingTaskId(null);
    }
  };

  const handleBlurContainer = (e: React.FocusEvent<HTMLDivElement>, taskId: string) => {
    // If the next focused element is still inside the current card's edit container, do not trigger save yet
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

  const renderPriorityBadge = (p: TaskPriority) => {
    const styles: Record<TaskPriority, string> = {
      urgent: 'bg-black text-white border-black',
      high: 'bg-stone-200 text-stone-900 border-stone-400',
      medium: 'bg-white text-stone-800 border-stone-300',
      low: 'bg-stone-100 text-stone-500 border-stone-200',
    };
    return (
      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono border ${styles[p]}`}>
        {p}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black tracking-tight mb-1">
            Hero Roadmap
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            Current Workspace Snapshot • 2 Founders • 14 Days
          </p>
        </div>

        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Dashboard Progress & Completion Metrics Visualizer */}
      <DashboardSummary onOpenAnalytics={onOpenAnalytics} />

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
              className="sm:col-span-5 bg-white border border-stone-300 rounded-none px-3 py-2 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
              autoFocus
            />

            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="sm:col-span-2 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black uppercase font-mono text-[11px]"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="sm:col-span-3 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-sans"
            >
              <option value="Founder A (Tech)">Founder A (Tech)</option>
              <option value="Founder B (Product)">Founder B (Product)</option>
              <option value="Forge Agent">Forge Agent</option>
            </select>

            <input
              type="number"
              step="0.5"
              min="0.5"
              max="14"
              value={newTaskEstimate}
              onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
              className="sm:col-span-2 bg-white border border-stone-300 rounded-none px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-mono"
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

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const totalDays = colTasks.reduce((acc, t) => acc + (t.estimateDays || 0), 0);

          return (
            <div
              key={col.id}
              className="bg-stone-50/70 border border-stone-200 p-3.5 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-200">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[11px] text-stone-800 uppercase tracking-widest">{col.title}</span>
                  <span className="text-[10px] font-mono text-stone-400">
                    ({String(colTasks.length).padStart(2, '0')})
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">{totalDays}d total</span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-32 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-serif italic">
                    Empty column
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    const isSaving = savingTaskId === task.id;

                    if (isEditing) {
                      return (
                        <div
                          key={task.id}
                          ref={inlineEditContainerRef}
                          onBlur={(e) => handleBlurContainer(e, task.id)}
                          className="p-3.5 border-2 border-black bg-white space-y-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                            <span className="text-[9px] font-mono text-stone-600 font-bold uppercase flex items-center space-x-1">
                              <Edit3 className="w-2.5 h-2.5 text-black" />
                              <span>Quick Edit • Blur to Save</span>
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
                              onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
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
                              onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
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
                                onChange={(e) => setEditValues({ ...editValues, priority: e.target.value as TaskPriority })}
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
                                onChange={(e) => setEditValues({ ...editValues, estimateDays: Number(e.target.value) })}
                                className="w-full bg-stone-50 border border-stone-300 p-1 text-[10px] font-mono focus:outline-hidden focus:border-black"
                              />
                            </div>

                            <div>
                              <label className="text-[8px] uppercase tracking-wider font-mono text-stone-400 block">
                                Assignee
                              </label>
                              <select
                                value={editValues.assignee}
                                onChange={(e) => setEditValues({ ...editValues, assignee: e.target.value })}
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

                    return (
                      <div
                        key={task.id}
                        className={`p-4 border border-stone-200 space-y-2.5 bg-[#FCFAF7] hover:border-black transition shadow-xs group ${
                          task.status === 'in_progress' ? 'border-l-2 border-l-black' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">
                            {task.id.toUpperCase()}
                          </span>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleStartInlineEdit(task)}
                              className="text-stone-400 hover:text-black transition p-1 bg-white border border-stone-200 hover:border-black"
                              title="Quick edit task inline (saves on blur via WebMCP update_task)"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-stone-400 hover:text-black transition p-1 bg-white border border-stone-200 hover:border-black"
                              title="Delete task (WebMCP delete_task)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Title with click-to-edit cursor */}
                        <h4
                          onClick={() => handleStartInlineEdit(task)}
                          className="text-sm font-medium leading-snug text-black cursor-pointer hover:underline decoration-stone-400 underline-offset-2"
                          title="Click to inline quick-edit task"
                        >
                          {task.title}
                        </h4>

                        {task.description && (
                          <p
                            onClick={() => handleStartInlineEdit(task)}
                            className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed font-serif italic cursor-pointer"
                            title="Click to inline quick-edit description"
                          >
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-200">
                          <div className="italic">
                            Assigned: <span className="font-sans not-italic text-stone-700 font-medium">{task.assignee}</span>
                          </div>
                          <div className="font-mono text-stone-800 font-medium">
                            {task.estimateDays}d
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {renderPriorityBadge(task.priority)}

                          <button
                            onClick={() => handleMoveTask(task.id, task.status)}
                            className="flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider text-stone-600 hover:text-black transition"
                            title="Advance task to next column status"
                          >
                            <span>Advance</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Tag,
  User,
  Flag,
  Archive,
  ArchiveRestore,
  Save,
  Flame,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Milestone, Subtask } from '../types/forge';

interface TaskCardModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => Promise<void> | void;
  onDelete?: (taskId: string) => Promise<void> | void;
  onArchiveToggle?: (task: Task) => Promise<void> | void;
  milestones: Milestone[];
}

/**
 * Calculates due date status relative to current date (or 2026-09-10).
 */
export function getDueDateAnalysis(dueDateStr?: string, isCompleted: boolean = false) {
  if (!dueDateStr) return null;

  // Use current date or parse
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dueDateStr.split('-');
  const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (isCompleted) {
    return {
      type: 'completed' as const,
      diffDays,
      formattedDate,
      label: `Due ${formattedDate}`,
      badgeClass: 'bg-stone-100 text-stone-500 border-stone-200',
      icon: Calendar,
      isWarning: false,
    };
  }

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      type: 'overdue' as const,
      diffDays,
      formattedDate,
      label: daysAgo === 1 ? `Overdue (Yesterday)` : `Overdue (${daysAgo}d ago)`,
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse',
      icon: AlertCircle,
      isWarning: true,
      urgencyMessage: `Due date passed by ${daysAgo} day${daysAgo > 1 ? 's' : ''} (${formattedDate}). Needs immediate resolution.`,
    };
  }

  if (diffDays === 0) {
    return {
      type: 'due_today' as const,
      diffDays: 0,
      formattedDate,
      label: 'Due Today',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 font-bold',
      icon: Flame,
      isWarning: true,
      urgencyMessage: `Task is due today (${formattedDate}). Complete or reschedule before end of day.`,
    };
  }

  if (diffDays <= 2) {
    return {
      type: 'approaching' as const,
      diffDays,
      formattedDate,
      label: diffDays === 1 ? 'Due Tomorrow' : `Due in 2 days`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      icon: Clock,
      isWarning: true,
      urgencyMessage: `Approaching deadline: Due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${formattedDate}).`,
    };
  }

  return {
    type: 'future' as const,
    diffDays,
    formattedDate,
    label: `Due ${formattedDate}`,
    badgeClass: 'bg-stone-50 text-stone-600 border-stone-200',
    icon: Calendar,
    isWarning: false,
    urgencyMessage: `Scheduled for delivery on ${formattedDate} (${diffDays} days remaining).`,
  };
}

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    borderClass: string;
    badgeClass: string;
    dotClass: string;
    iconColor: string;
    description: string;
  }
> = {
  urgent: {
    label: 'Urgent',
    borderClass: 'border-l-4 border-l-red-600',
    badgeClass: 'bg-red-50 text-red-700 border-red-300 font-bold',
    dotClass: 'bg-red-600',
    iconColor: 'text-red-600',
    description: 'Immediate blocker / critical production impact',
  },
  high: {
    label: 'High',
    borderClass: 'border-l-4 border-l-amber-500',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    dotClass: 'bg-amber-500',
    iconColor: 'text-amber-500',
    description: 'High priority milestone deliverable',
  },
  medium: {
    label: 'Medium',
    borderClass: 'border-l-4 border-l-blue-500',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-medium',
    dotClass: 'bg-blue-500',
    iconColor: 'text-blue-500',
    description: 'Standard product sprint task',
  },
  low: {
    label: 'Low',
    borderClass: 'border-l-4 border-l-slate-400',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-200 font-medium',
    dotClass: 'bg-slate-400',
    iconColor: 'text-slate-400',
    description: 'Nice-to-have or exploratory backlog item',
  },
};

export const TaskCardModal: React.FC<TaskCardModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onArchiveToggle,
  milestones,
}) => {
  if (!isOpen || !task) return null;

  // Local draft state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'medium');
  const [assignee, setAssignee] = useState(task.assignee || 'Founder A (Tech)');
  const [estimateDays, setEstimateDays] = useState(task.estimateDays || 1);
  const [dueDate, setDueDate] = useState<string>(task.dueDate || '');
  const [milestoneId, setMilestoneId] = useState<string>(task.milestoneId || '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);

  // New subtask input state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority || 'medium');
    setAssignee(task.assignee || 'Founder A (Tech)');
    setEstimateDays(task.estimateDays || 1);
    setDueDate(task.dueDate || '');
    setMilestoneId(task.milestoneId || '');
    setSubtasks(task.subtasks || []);
  }, [task]);

  // Subtask calculations
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const progressPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Due Date analysis
  const dateAnalysis = getDueDateAnalysis(dueDate, status === 'done');

  // Subtask handlers
  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSub: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    setSubtasks(
      subtasks.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteSubtask = (subId: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== subId));
  };

  const handleSubtaskTitleChange = (subId: string, newTitle: string) => {
    setSubtasks(
      subtasks.map((s) => (s.id === subId ? { ...s, title: newTitle } : s))
    );
  };

  // Quick date presets
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const isoDate = d.toISOString().split('T')[0];
    setDueDate(isoDate);
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    const updated: Task = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee,
      estimateDays: Number(estimateDays),
      dueDate: dueDate || undefined,
      milestoneId: milestoneId || undefined,
      subtasks,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white border-2 border-black max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] flex flex-col max-h-[92vh] overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Top Bar */}
          <div className="p-4 sm:p-5 border-b border-black bg-stone-50 flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold bg-white border border-stone-300 px-2 py-0.5">
                  {task.id.toUpperCase()}
                </span>

                {/* Priority Selector Pill */}
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2 py-0.5 text-[10px] uppercase font-mono border ${PRIORITY_CONFIG[priority].badgeClass}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[priority].dotClass}`}
                    />
                    <span>{PRIORITY_CONFIG[priority].label} Priority</span>
                  </span>
                </div>

                {/* Status selector */}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="bg-white border border-stone-300 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-stone-800 focus:outline-hidden focus:border-black cursor-pointer"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review / Gate</option>
                  <option value="done">Completed</option>
                </select>

                {task.archived && (
                  <span className="px-2 py-0.5 bg-stone-200 text-stone-700 text-[10px] font-mono uppercase font-bold border border-stone-300">
                    Archived
                  </span>
                )}
              </div>

              {/* Title input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full font-serif text-xl sm:text-2xl font-bold text-black border-b border-transparent hover:border-stone-300 focus:border-black focus:outline-hidden bg-transparent py-1 transition"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-black transition p-1.5 border border-stone-200 hover:border-black bg-white shrink-0"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
            {/* Due Date Approaching / Passed Warning Alert Banner */}
            {dateAnalysis && dateAnalysis.isWarning && status !== 'done' && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 border flex items-start space-x-3 ${
                  dateAnalysis.type === 'overdue'
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {dateAnalysis.type === 'overdue' ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-0.5 flex-1">
                  <div className="font-bold uppercase font-mono tracking-wider">
                    {dateAnalysis.type === 'overdue'
                      ? 'Action Required: Due Date Passed'
                      : 'Deadline Approaching'}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {dateAnalysis.urgencyMessage}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Grid 2-columns: Left side specs & due date, Right side Subtasks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Properties & Due Date Picker */}
              <div className="lg:col-span-6 space-y-5">
                {/* Description Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                    Specification & Context
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details, acceptance criteria, or technical spec..."
                    className="w-full bg-[#FCFAF7] border border-stone-300 p-2.5 text-xs text-stone-800 font-serif italic focus:outline-hidden focus:border-black leading-relaxed"
                  />
                </div>

                {/* Priority Level Segmented Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                      Priority Level
                    </label>
                    <span className="text-[9px] font-mono text-stone-400">
                      Color-coded across cards
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => {
                      const cfg = PRIORITY_CONFIG[p];
                      const isSelected = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 border text-[10px] font-mono uppercase font-bold transition ${
                            isSelected
                              ? `${cfg.badgeClass} ring-1 ring-black shadow-2xs`
                              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date Picker Integration */}
                <div className="space-y-2 p-3.5 bg-stone-50 border border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-black font-bold flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due Date Picker</span>
                    </label>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate('')}
                        className="text-[9px] font-mono uppercase text-stone-400 hover:text-red-600 transition"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-white border border-stone-300 px-3 py-1.5 text-xs text-black font-mono focus:outline-hidden focus:border-black flex-1"
                    />
                    {dateAnalysis && (
                      <span
                        className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider border shrink-0 ${dateAnalysis.badgeClass}`}
                      >
                        {dateAnalysis.label}
                      </span>
                    )}
                  </div>

                  {/* Quick Preset Date Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] font-mono text-stone-400">Quick set:</span>
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2 py-0.5 bg-white hover:bg-stone-200 text-stone-700 text-[9px] font-mono border border-stone-300 transition"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="px-2 py-0.5 bg-white hover:bg-stone-200 text-stone-700 text-[9px] font-mono border border-stone-300 transition"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(3)}
                      className="px-2 py-0.5 bg-white hover:bg-stone-200 text-stone-700 text-[9px] font-mono border border-stone-300 transition"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(7)}
                      className="px-2 py-0.5 bg-white hover:bg-stone-200 text-stone-700 text-[9px] font-mono border border-stone-300 transition"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>

                {/* Attribution Row (Assignee, Estimate, Milestone) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                      Assignee
                    </label>
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="w-full bg-white border border-stone-300 p-1.5 text-xs focus:outline-hidden focus:border-black"
                    >
                      <option value="Founder A (Tech)">Founder A (Tech)</option>
                      <option value="Founder B (Product)">Founder B (Product)</option>
                      <option value="Forge Agent">Forge Agent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                      Estimate (Days)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="14"
                      value={estimateDays}
                      onChange={(e) => setEstimateDays(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 p-1.5 text-xs font-mono focus:outline-hidden focus:border-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                      Milestone Phase
                    </label>
                    <select
                      value={milestoneId}
                      onChange={(e) => setMilestoneId(e.target.value)}
                      className="w-full bg-white border border-stone-300 p-1.5 text-xs truncate focus:outline-hidden focus:border-black"
                    >
                      <option value="">(No Milestone)</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Subtask Checklist & Progress Tracker */}
              <div className="lg:col-span-6 flex flex-col space-y-3 bg-[#FCFAF7] border border-stone-300 p-4">
                {/* Subtask Header & Progress Meter */}
                <div className="space-y-2 pb-3 border-b border-stone-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckSquare className="w-4 h-4 text-black" />
                      <span className="font-bold text-xs uppercase tracking-wider text-black font-mono">
                        Subtasks & Checklist
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-700 bg-white border border-stone-200 px-2 py-0.5">
                      {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-200 h-2 overflow-hidden border border-stone-300">
                    <motion.div
                      className={`h-full transition-all duration-300 ${
                        progressPercent === 100
                          ? 'bg-emerald-600'
                          : progressPercent > 50
                          ? 'bg-black'
                          : 'bg-stone-700'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {progressPercent === 100 && totalSubtasks > 0 && (
                    <div className="flex items-center space-x-1.5 text-emerald-800 text-[10px] font-mono uppercase font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>All subtasks completed! Ready for review.</span>
                    </div>
                  )}
                </div>

                {/* Subtask Add Form */}
                <form onSubmit={handleAddSubtask} className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add checklist item... (Press Enter)"
                    className="flex-1 bg-white border border-stone-300 px-2.5 py-1.5 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
                  />
                  <button
                    type="submit"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] font-mono uppercase font-bold tracking-wider transition shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Subtask Item List */}
                <div className="space-y-1.5 flex-1 max-h-[260px] overflow-y-auto pr-1">
                  {subtasks.length === 0 ? (
                    <div className="py-8 text-center text-stone-400 space-y-1">
                      <CheckSquare className="w-6 h-6 mx-auto stroke-1 text-stone-300" />
                      <p className="text-[11px] font-mono uppercase tracking-wider">
                        No subtasks added yet
                      </p>
                      <p className="text-[10px] text-stone-400 font-sans">
                        Break down this task into smaller verifiable deliverables above.
                      </p>
                    </div>
                  ) : (
                    subtasks.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className={`flex items-center justify-between p-2 border transition group ${
                          sub.completed
                            ? 'bg-stone-100/80 border-stone-200'
                            : 'bg-white border-stone-300 hover:border-black'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(sub.id)}
                            className={`p-0.5 transition shrink-0 ${
                              sub.completed ? 'text-emerald-700' : 'text-stone-400 hover:text-black'
                            }`}
                            title={sub.completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {sub.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={sub.title}
                            onChange={(e) => handleSubtaskTitleChange(sub.id, e.target.value)}
                            className={`w-full text-xs font-sans bg-transparent border-b border-transparent hover:border-stone-300 focus:border-black focus:outline-hidden transition ${
                              sub.completed
                                ? 'line-through text-stone-400'
                                : 'text-stone-900 font-medium'
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="text-stone-300 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2"
                          title="Remove subtask"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Bar */}
          <div className="p-4 border-t border-black bg-stone-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              {onArchiveToggle && (
                <button
                  type="button"
                  onClick={() => {
                    onArchiveToggle(task);
                    onClose();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 border border-stone-300 hover:border-black bg-white text-stone-700 hover:text-black text-[10px] font-mono uppercase font-bold tracking-wider transition"
                >
                  {task.archived ? (
                    <>
                      <ArchiveRestore className="w-3 h-3" />
                      <span>Restore Task</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </>
                  )}
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete task "${task.title}"?`)) {
                      onDelete(task.id);
                      onClose();
                    }
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 border border-stone-300 hover:border-red-600 bg-white text-stone-500 hover:text-red-600 text-[10px] font-mono uppercase font-bold tracking-wider transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 border border-stone-300 hover:border-stone-500 bg-white text-stone-700 text-[10px] font-mono uppercase font-bold tracking-wider transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveModal}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-5 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] font-mono uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
              >
                <Save className="w-3 h-3" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

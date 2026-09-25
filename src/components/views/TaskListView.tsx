import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Trash2,
  User,
  Tag,
  Plus,
  Archive,
  ArchiveRestore,
  X,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskPriority, TaskStatus, ChangeProposal, AgentAction } from '../../types/forge';
import { matchesTaskFuzzy, formatRelativeTime, formatFullDateTime } from '../../utils/taskFilters';
import { PRIORITY_CONFIG } from '../TaskCardModal';
import { getPriorityRank, PrioritySortMode } from './KanbanBoardView';

export const getCoCreationStatus = (
  task: Task,
  proposals: ChangeProposal[] = [],
  actions: AgentAction[] = []
): { isAgent: boolean; kind: 'created' | 'modified' | 'suggested'; label: string; tooltip: string } => {
  if (task.agentSuggested || task.isAgentCreated) {
    return {
      isAgent: true,
      kind: 'suggested',
      label: 'Suggestion',
      tooltip: task.suggestionRationale || 'AI Suggestion: Auto-populated by Forge Agent during project scaffolding',
    };
  }
  if (task.isAgentModified) {
    return {
      isAgent: true,
      kind: 'modified',
      label: 'Suggestion',
      tooltip: task.suggestionRationale || 'AI Suggestion: Refined and updated by Forge Agent via co-creation diff',
    };
  }
  if (task.assignee === 'Forge Agent') {
    return {
      isAgent: true,
      kind: 'suggested',
      label: 'Suggestion',
      tooltip: 'AI Suggestion: Assigned to Forge Agent for automated tool execution',
    };
  }
  const agentTags = ['agent', 'aigenerated', 'suggested', 'cocreated', 'webmcpcreated', 'agentsuggested', 'autopopulated'];
  if (task.tags && task.tags.some((t) => agentTags.includes(t.toLowerCase()))) {
    return {
      isAgent: true,
      kind: 'suggested',
      label: 'Suggestion',
      tooltip: 'AI Suggestion: Co-created by agent to satisfy milestone scope',
    };
  }
  if (task.comments && task.comments.some((c) => c.author === 'Forge Agent')) {
    return {
      isAgent: true,
      kind: 'modified',
      label: 'Suggestion',
      tooltip: 'AI Suggestion: Reviewed and augmented with technical agent validation notes',
    };
  }
  const matchingProposal = proposals.find(
    (p) =>
      p.proposedBy === 'agent' &&
      p.changes.some((c) => c.entityType === 'task' && c.entityId === task.id)
  );
  if (matchingProposal) {
    return {
      isAgent: true,
      kind: 'modified',
      label: 'Suggestion',
      tooltip: `AI Suggestion: Created or modified in proposal "${matchingProposal.title}"`,
    };
  }
  const matchingAction = actions.find(
    (a) =>
      a.source !== 'human_review' &&
      ((a.affectedObjects && a.affectedObjects.some((o) => o.id === task.id)) ||
        a.input?.taskId === task.id ||
        a.result?.taskId === task.id)
  );
  if (matchingAction) {
    return {
      isAgent: true,
      kind: 'modified',
      label: 'Suggestion',
      tooltip: `AI Suggestion: Modified via agent tool execution "${matchingAction.toolName}"`,
    };
  }
  return { isAgent: false, kind: 'suggested', label: '', tooltip: '' };
};

export const TaskListView: React.FC = () => {
  const { tasks, proposals, actions, executeToolByName } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [prioritySort, setPrioritySort] = useState<PrioritySortMode>('none');
  const [coCreationFilter, setCoCreationFilter] = useState<'all' | 'suggestions' | 'human'>('all');

  const suggestionCount = useMemo(() => {
    return tasks.filter((t) => !t.archived && getCoCreationStatus(t, proposals, actions).isAgent).length;
  }, [tasks, proposals, actions]);

  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => {
      const matchesSearch = matchesTaskFuzzy(t, searchQuery);
      
      const matchesStatus =
        statusFilter === 'all'
          ? !t.archived
          : statusFilter === 'archived'
          ? !!t.archived
          : !t.archived && t.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all'
          ? true
          : priorityFilter === 'critical'
          ? t.priority === 'critical' || t.priority === 'urgent'
          : t.priority === priorityFilter;

      const coCreation = getCoCreationStatus(t, proposals, actions);
      const matchesCoCreation =
        coCreationFilter === 'all'
          ? true
          : coCreationFilter === 'suggestions'
          ? coCreation.isAgent
          : !coCreation.isAgent;

      return matchesSearch && matchesStatus && matchesPriority && matchesCoCreation;
    });

    if (prioritySort === 'critical-first') {
      list = [...list].sort((a, b) => getPriorityRank(b.priority) - getPriorityRank(a.priority));
    } else if (prioritySort === 'low-first') {
      list = [...list].sort((a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority));
    }

    return list;
  }, [tasks, searchQuery, statusFilter, priorityFilter, prioritySort, coCreationFilter, proposals, actions]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    await executeToolByName('update_task', { taskId: task.id, status: newStatus });
  };

  const handleArchiveToggle = async (task: Task) => {
    if (task.archived) {
      await executeToolByName('archive_task', { taskId: task.id, unarchive: true });
    } else {
      await executeToolByName('archive_task', { taskId: task.id });
    }
  };

  const handleDelete = async (taskId: string) => {
    await executeToolByName('delete_task', { taskId });
  };

  const handleTogglePrioritySort = () => {
    setPrioritySort((prev) =>
      prev === 'none' ? 'critical-first' : prev === 'critical-first' ? 'low-first' : 'none'
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-black dark:border-stone-800">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black dark:text-white tracking-tight mb-1">
            Structured Tasks
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            {tasks.length} total tasks • {tasks.filter((t) => t.status === 'done').length} completed • {suggestionCount} AI co-created suggestions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Fuzzy Search Filter */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fuzzy search tasks..."
              className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 pl-8 pr-7 py-1.5 text-xs text-black dark:text-white placeholder-stone-400 focus:outline-hidden focus:border-black dark:focus:border-white w-48 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-stone-400 hover:text-black dark:hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* AI Suggestions Quick Filter Chip */}
          <button
            type="button"
            onClick={() => setCoCreationFilter((prev) => (prev === 'suggestions' ? 'all' : 'suggestions'))}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 border text-[11px] font-mono uppercase tracking-wider transition ${
              coCreationFilter === 'suggestions'
                ? 'bg-violet-700 text-white border-violet-800 font-bold shadow-2xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300'
            }`}
            title="Filter tasks to show only AI-generated or agent-modified co-creation items"
          >
            <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
            <span>Suggestions ({suggestionCount})</span>
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-2.5 py-1.5 text-[11px] font-mono uppercase text-stone-700 dark:text-stone-300 focus:outline-hidden focus:border-black"
          >
            <option value="all">Active Tasks</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Completed</option>
            <option value="archived">Archived</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-2.5 py-1.5 text-[11px] font-mono uppercase text-stone-700 dark:text-stone-300 focus:outline-hidden focus:border-black"
          >
            <option value="all">All Priorities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🔵 Medium</option>
            <option value="low">⚪ Low</option>
          </select>

          {/* Sort by Priority Toggle */}
          <button
            type="button"
            onClick={handleTogglePrioritySort}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 border text-[11px] font-mono uppercase tracking-wider transition ${
              prioritySort === 'critical-first'
                ? 'bg-red-600 text-white border-red-700 font-bold shadow-2xs'
                : prioritySort === 'low-first'
                ? 'bg-stone-800 text-white border-stone-900 font-bold shadow-2xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-black dark:hover:border-white'
            }`}
            title="Sort tasks by priority level (Critical First → Low First → Default)"
          >
            <ArrowUpDown className="w-3 h-3 shrink-0" />
            <span>
              {prioritySort === 'critical-first'
                ? 'Critical First'
                : prioritySort === 'low-first'
                ? 'Low First'
                : 'Sort: Priority'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Sort Status Feedback */}
      {(searchQuery || coCreationFilter !== 'all' || prioritySort !== 'none') && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-mono text-stone-700 dark:text-stone-300">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {searchQuery && (
              <span className="inline-flex items-center space-x-1">
                <Search className="w-3 h-3 text-stone-400" />
                <span>Matching <strong>"{searchQuery}"</strong></span>
              </span>
            )}
            {coCreationFilter === 'suggestions' && (
              <span className="inline-flex items-center space-x-1 text-violet-700 dark:text-violet-300 font-bold">
                <Sparkles className="w-3 h-3" />
                <span>Showing AI Suggestions only</span>
              </span>
            )}
            {prioritySort !== 'none' && (
              <span className="inline-flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold">
                <Flame className="w-3 h-3" />
                <span>Sorted by Priority ({prioritySort === 'critical-first' ? 'Critical → Low' : 'Low → Critical'})</span>
              </span>
            )}
            <span className="text-stone-400">— showing {filteredTasks.length} of {tasks.length} tasks</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCoCreationFilter('all');
              setPrioritySort('none');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
            className="underline hover:text-black dark:hover:text-white transition font-medium cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Task Table */}
      <div className="bg-white dark:bg-stone-900 border border-black dark:border-stone-700 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 dark:bg-stone-800 border-b border-black dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase tracking-widest text-[10px] font-bold">
                <th className="py-3 px-4 w-12">Done</th>
                <th className="py-3 px-4">Task Details</th>
                <th className="py-3 px-4 w-28">Status</th>
                <th
                  onClick={handleTogglePrioritySort}
                  className="py-3 px-4 w-32 cursor-pointer select-none hover:bg-stone-200 dark:hover:bg-stone-700/60 transition group/th"
                  title="Click to cycle sort: Critical first → Low first → Default order"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Priority</span>
                    <ArrowUpDown
                      className={`w-3 h-3 transition ${
                        prioritySort !== 'none'
                          ? 'text-black dark:text-white'
                          : 'text-stone-400 group-hover/th:text-stone-700 dark:group-hover/th:text-stone-200'
                      }`}
                    />
                    {prioritySort !== 'none' && (
                      <span className="text-[8px] font-mono lowercase text-stone-500">
                        ({prioritySort === 'critical-first' ? 'crit' : 'low'})
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 w-36">Assignee</th>
                <th className="py-3 px-4 w-32">Last Modified</th>
                <th className="py-3 px-4 w-20 text-right">Effort</th>
                <th className="py-3 px-4 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400 font-serif italic text-sm">
                    No matching tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const agentInfo = getCoCreationStatus(task, proposals, actions);
                  const normalizedPriority = (task.priority === 'urgent' ? 'critical' : task.priority) || 'medium';
                  const priorityConfig = PRIORITY_CONFIG[normalizedPriority] || PRIORITY_CONFIG.medium;
                  const isCritical = task.priority === 'critical' || task.priority === 'urgent';

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-[#FCFAF7] dark:hover:bg-stone-800/60 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          className={`w-4 h-4 border flex items-center justify-center transition ${
                            task.status === 'done'
                              ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                              : 'border-stone-400 hover:border-black bg-white dark:bg-stone-900'
                          }`}
                        >
                          {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-medium text-black dark:text-white group-hover:text-stone-900 dark:group-hover:text-stone-200 transition text-sm">
                            {task.title}
                          </span>

                          {/* Subtle AI-generated 'Suggestion' badge to highlight co-creation */}
                          {agentInfo.isAgent && (
                            <span
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60 rounded-xs shadow-2xs hover:bg-violet-100 dark:hover:bg-violet-900/50 transition cursor-help shrink-0"
                              title={agentInfo.tooltip}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-violet-500 dark:text-violet-400 shrink-0" />
                              <span>Suggestion</span>
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <div className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1 mt-0.5 font-serif italic">
                            {task.description}
                          </div>
                        )}

                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[9px] bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-mono"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase font-medium border ${
                            task.status === 'done'
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-200 border-black dark:border-stone-600'
                              : task.status === 'in_progress'
                              ? 'bg-stone-200 dark:bg-stone-800 text-black dark:text-white border-stone-400'
                              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Visual Priority Badges (Low, Medium, High, Critical) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2 py-0.5 text-[9px] font-mono uppercase font-bold border transition ${
                            priorityConfig.badgeClass
                          } ${isCritical ? 'shadow-2xs ring-1 ring-red-500/20' : ''}`}
                          title={`Priority: ${priorityConfig.label} - ${priorityConfig.description}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotClass} ${isCritical ? 'animate-pulse' : ''}`} />
                          {isCritical && <Flame className="w-2.5 h-2.5 text-red-600 dark:text-red-400 shrink-0" />}
                          <span>{priorityConfig.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-stone-700 dark:text-stone-300">
                        <div className="flex items-center space-x-1.5 font-sans">
                          <User className="w-3 h-3 text-stone-400" />
                          <span className="truncate">{task.assignee}</span>
                        </div>
                      </td>

                      {/* Visual Last Modified Timestamp */}
                      <td className="py-3.5 px-4">
                        <div
                          className="inline-flex items-center space-x-1.5 text-stone-500 dark:text-stone-400 font-mono text-[11px]"
                          title={`Last modified: ${formatFullDateTime(task.updatedAt || task.createdAt)}`}
                        >
                          <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="whitespace-nowrap">
                            {formatRelativeTime(task.updatedAt || task.createdAt)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-stone-900 dark:text-stone-200 font-medium">
                        {task.estimateDays}d
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleArchiveToggle(task)}
                            className="text-stone-400 hover:text-black dark:hover:text-white transition p-1"
                            title={task.archived ? 'Restore to active board' : 'Archive task to keep workspace tidy'}
                          >
                            {task.archived ? (
                              <ArchiveRestore className="w-3.5 h-3.5 text-black dark:text-white" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-stone-400 hover:text-black dark:hover:text-white transition p-1"
                            title="Delete task via WebMCP"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

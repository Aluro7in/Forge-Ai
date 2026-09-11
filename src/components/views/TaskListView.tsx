import React, { useState } from 'react';
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
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskPriority, TaskStatus } from '../../types/forge';
import { matchesTaskFuzzy, formatRelativeTime, formatFullDateTime } from '../../utils/taskFilters';

export const TaskListView: React.FC = () => {
  const { tasks, executeToolByName } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = matchesTaskFuzzy(t, searchQuery);
    
    const matchesStatus =
      statusFilter === 'all'
        ? !t.archived
        : statusFilter === 'archived'
        ? !!t.archived
        : !t.archived && t.status === statusFilter;

    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-black dark:border-stone-800">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black dark:text-white tracking-tight mb-1">
            Structured Tasks
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            {tasks.length} total tasks • {tasks.filter((t) => t.status === 'done').length} completed • Synchronized with WebMCP
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
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Filter Status Feedback */}
      {searchQuery && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-mono text-stone-700 dark:text-stone-300">
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <span>
              Fuzzy search matching <strong>"{searchQuery}"</strong> — showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="underline hover:text-black dark:hover:text-white transition font-medium cursor-pointer"
          >
            Clear filter
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
                <th className="py-3 px-4 w-24">Priority</th>
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
                filteredTasks.map((task) => (
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
                      <div className="font-medium text-black dark:text-white group-hover:text-stone-900 dark:group-hover:text-stone-200 transition text-sm">
                        {task.title}
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

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold border ${
                          task.priority === 'urgent'
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                            : task.priority === 'high'
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-200 border-stone-400 dark:border-stone-600'
                            : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {task.priority}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

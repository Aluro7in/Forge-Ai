import React, { useState } from 'react';
import {
  Flag,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Milestone } from '../../types/forge';

export const MilestonesView: React.FC = () => {
  const { milestones, tasks, executeToolByName } = useWorkspace();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('2026-09-18');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await executeToolByName('create_milestone', {
      title: title.trim(),
      description: description.trim(),
      targetDate,
    });

    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black tracking-tight mb-1">
            Delivery Gates
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            Roadmap targets and synchronization gates managed through WebMCP planning tools
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Gate</span>
        </button>
      </div>

      {/* Add Milestone Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-[#FCFAF7] border border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between text-xs text-black font-bold uppercase tracking-wider font-mono">
            <span>Create New Milestone Gate</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-stone-400 hover:text-black font-mono"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone title (e.g. Week 1: Production Beta)..."
              className="sm:col-span-6 bg-white border border-stone-300 px-3 py-2 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
              autoFocus
            />

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deliverables description..."
              className="sm:col-span-4 bg-white border border-stone-300 px-3 py-2 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
            />

            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="sm:col-span-2 bg-white border border-stone-300 px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 border border-stone-300 hover:border-black text-[10px] uppercase font-bold text-stone-600 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
            >
              Save Milestone
            </button>
          </div>
        </form>
      )}

      {/* Timeline Stream */}
      <div className="space-y-6">
        {milestones.map((ms, idx) => {
          const linkedTasks = tasks.filter((t) => t.milestoneId === ms.id);
          const doneTasks = linkedTasks.filter((t) => t.status === 'done');
          const percent =
            linkedTasks.length > 0 ? Math.round((doneTasks.length / linkedTasks.length) * 100) : 0;

          return (
            <div
              key={ms.id}
              className="bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)] space-y-4 relative overflow-hidden"
            >
              {/* Title & Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 font-mono">
                      Gate 0{idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase font-mono border ${
                        ms.status === 'completed'
                          ? 'bg-black text-white border-black'
                          : ms.status === 'active'
                          ? 'bg-stone-100 text-stone-900 border-stone-400'
                          : 'bg-white text-stone-500 border-stone-300'
                      }`}
                    >
                      {ms.status}
                    </span>
                  </div>
                  <h3 className="font-serif italic text-2xl text-black tracking-tight font-normal">
                    {ms.title}
                  </h3>
                  <p className="text-xs text-stone-600 max-w-2xl font-serif">
                    {ms.description}
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="flex items-center space-x-1.5 text-xs text-stone-700 bg-stone-50 px-3 py-1.5 border border-stone-300 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    <span>{ms.targetDate}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-stone-600 font-mono">
                  <span>
                    Progress: {doneTasks.length} / {linkedTasks.length} tasks completed
                  </span>
                  <span className="font-bold text-black">{percent}%</span>
                </div>
                <div className="w-full h-2 bg-stone-100 border border-stone-300 overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Linked Tasks Preview */}
              {linkedTasks.length > 0 && (
                <div className="pt-3 border-t border-stone-200">
                  <div className="text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-widest font-mono">
                    Linked Tasks ({linkedTasks.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {linkedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-[#FCFAF7] p-2.5 border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              t.status === 'done' ? 'bg-black' : 'bg-stone-400'
                            }`}
                          />
                          <span className="text-stone-800 truncate font-medium">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono shrink-0 ml-2">
                          {t.estimateDays}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

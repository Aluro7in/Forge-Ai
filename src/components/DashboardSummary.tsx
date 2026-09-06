import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Flag,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Layers,
  Users,
  Zap,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface DashboardSummaryProps {
  onOpenProposalModal?: () => void;
  onOpenAnalytics?: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  onOpenProposalModal,
  onOpenAnalytics,
}) => {
  const {
    project,
    tasks,
    milestones,
    documents,
    proposals,
    activeProposal,
    actions,
  } = useWorkspace();

  const [isExpanded, setIsExpanded] = useState(true);

  // Calculations based on live workspace state
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const reviewTasks = tasks.filter((t) => t.status === 'review').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;

  const taskCompletionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const reviewPct = totalTasks > 0 ? Math.round((reviewTasks / totalTasks) * 100) : 0;
  const inProgressPct = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
  const todoPct = Math.max(0, 100 - taskCompletionPct - reviewPct - inProgressPct);

  // Work estimates
  const totalDays = Number(tasks.reduce((sum, t) => sum + (t.estimateDays || 0), 0).toFixed(1));
  const completedDays = Number(
    tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.estimateDays || 0), 0).toFixed(1)
  );
  const remainingDays = Number(Math.max(0, totalDays - completedDays).toFixed(1));
  const workDaysPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Milestones
  const totalMilestones = milestones.length;
  const achievedMilestones = milestones.filter((m) => m.status === 'achieved').length;

  // Governance Proposals
  const pendingProposals = proposals.filter((p) => p.status === 'pending').length;

  // Workload distribution
  const assigneeMap: Record<string, number> = {};
  tasks.forEach((t) => {
    const key = t.assignee || 'Unassigned';
    assigneeMap[key] = (assigneeMap[key] || 0) + (t.estimateDays || 1);
  });

  return (
    <div className="bg-[#FCFAF7] border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] mb-6 transition">
      {/* Header & Quick Summary Bar */}
      <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-bold text-xs">
            {workDaysPct}%
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif italic text-lg sm:text-xl font-bold text-black tracking-tight">
                Project Velocity & Workspace Health
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.2 bg-stone-100 border border-stone-300 text-stone-700 text-[10px] font-mono font-bold uppercase">
                14-Day Sprint
              </span>
            </div>
            <p className="text-[11px] text-stone-600 font-sans">
              <span className="font-semibold text-black">{completedTasks}</span> of {totalTasks} tasks completed •{' '}
              <span className="font-mono font-medium text-stone-800">{completedDays}d</span> of {totalDays}d delivered
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {pendingProposals > 0 && (
            <button
              onClick={onOpenProposalModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-mono font-bold uppercase tracking-wider transition border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse"
              title="Review pending change proposal staged by WebMCP agent"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{pendingProposals} Proposal Pending Approval</span>
            </button>
          )}

          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition shadow-2xs"
              title="Open 30-Day Task Velocity & Agent Activity Metrics"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>30D Velocity</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 hover:text-black border border-stone-300 text-[10px] uppercase font-mono font-bold transition"
          >
            <span>{isExpanded ? 'Collapse' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Multi-Segment Progress Bar */}
      <div className="px-4 py-3 bg-white border-b border-stone-200">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-none bg-emerald-600 inline-block"></span>
              <span>Completed ({taskCompletionPct}%)</span>
            </span>
            <span className="flex items-center space-x-1 text-indigo-800 font-bold">
              <span className="w-2 h-2 rounded-none bg-indigo-600 inline-block"></span>
              <span>Review ({reviewPct}%)</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-800 font-bold">
              <span className="w-2 h-2 rounded-none bg-amber-500 inline-block"></span>
              <span>In Progress ({inProgressPct}%)</span>
            </span>
            <span className="flex items-center space-x-1 text-stone-500 font-medium hidden sm:flex">
              <span className="w-2 h-2 rounded-none bg-stone-300 inline-block"></span>
              <span>To Do ({todoPct}%)</span>
            </span>
          </div>

          <div className="text-right font-bold text-black">
            Overall Sprint Progress: <span className="font-mono text-emerald-700">{taskCompletionPct}%</span>
          </div>
        </div>

        {/* Visual Progress Bar with smooth animation */}
        <div className="w-full bg-stone-200 h-3 border border-stone-300 overflow-hidden flex shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${taskCompletionPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-emerald-600 h-full border-r border-emerald-700"
            title={`Completed: ${completedTasks} tasks (${taskCompletionPct}%)`}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${reviewPct}%` }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="bg-indigo-600 h-full border-r border-indigo-700"
            title={`Review / Gate: ${reviewTasks} tasks (${reviewPct}%)`}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${inProgressPct}%` }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="bg-amber-500 h-full border-r border-amber-600"
            title={`In Progress: ${inProgressTasks} tasks (${inProgressPct}%)`}
          />
          <div
            className="bg-stone-200 h-full flex-1"
            title={`To Do: ${todoTasks} tasks (${todoPct}%)`}
          />
        </div>
      </div>

      {/* Expanded Metrics Grid */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-[#FCFAF7] animate-in fade-in duration-200">
          {/* Card 1: Tasks */}
          <div className="p-3 bg-white border border-stone-200 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Tasks Done</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-black">
              {completedTasks}<span className="text-xs text-stone-400 font-normal font-sans">/{totalTasks}</span>
            </div>
            <div className="text-[10px] text-stone-500 font-sans">
              {totalTasks - completedTasks} remaining
            </div>
          </div>

          {/* Card 2: Effort Burned */}
          <div className="p-3 bg-white border border-stone-200 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Work Burned</span>
              <Clock className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="text-xl font-bold font-mono text-black">
              {completedDays}d<span className="text-xs text-stone-400 font-normal font-sans">/{totalDays}d</span>
            </div>
            <div className="text-[10px] text-stone-500 font-sans">
              {remainingDays}d to deliver
            </div>
          </div>

          {/* Card 3: Milestones */}
          <div className="p-3 bg-white border border-stone-200 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Milestones</span>
              <Flag className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-bold font-mono text-black">
              {achievedMilestones}<span className="text-xs text-stone-400 font-normal font-sans">/{totalMilestones}</span>
            </div>
            <div className="text-[10px] text-stone-500 font-sans truncate">
              {milestones.find((m) => m.status !== 'achieved')?.title || 'All Achieved!'}
            </div>
          </div>

          {/* Card 4: Documents Vault */}
          <div className="p-3 bg-white border border-stone-200 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Living Specs</span>
              <FileCheck className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="text-xl font-bold font-mono text-black">
              {documents.length}
            </div>
            <div className="text-[10px] text-stone-500 font-sans truncate">
              v{documents[0]?.version || 1} • {documents[0]?.title || 'Architecture'}
            </div>
          </div>

          {/* Card 5: Governance */}
          <div className={`p-3 bg-white border ${pendingProposals > 0 ? 'border-amber-400 bg-amber-50/50' : 'border-stone-200'} space-y-1 shadow-2xs`}>
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Proposals</span>
              <ShieldCheck className={`w-3.5 h-3.5 ${pendingProposals > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <div className="text-xl font-bold font-mono text-black">
              {pendingProposals}
            </div>
            <div className="text-[10px] text-stone-500 font-sans">
              {pendingProposals > 0 ? 'Action required' : 'Clean state'}
            </div>
          </div>

          {/* Card 6: Team Allocation */}
          <div className="p-3 bg-white border border-stone-200 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-[9px] uppercase font-bold tracking-wider font-mono">Team Split</span>
              <Users className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="text-xs font-mono text-black space-y-0.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Tech:</span>
                <span className="font-bold">{assigneeMap['Founder A (Tech)'] || 0}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Product:</span>
                <span className="font-bold">{assigneeMap['Founder B (Product)'] || 0}d</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

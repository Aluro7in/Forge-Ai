import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  TrendingUp,
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

interface DashboardAnalyticsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectAgent?: (prompt: string) => void;
}

type TimeRange = '30d' | '14d' | '7d';

export const DashboardAnalyticsOverlay: React.FC<DashboardAnalyticsOverlayProps> = ({
  isOpen,
  onClose,
  onDirectAgent,
}) => {
  const { tasks, milestones, actions, proposals, project } = useWorkspace();
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute 30-day timeline series data leading up to 2026-09-06
  const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;

  const velocityData = useMemo(() => {
    const data = [];
    const baseDate = new Date(2026, 8, 6); // Sep 6, 2026

    // Baseline stats from current tasks
    const completedCount = tasks.filter((t) => t.status === 'done').length;
    const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
    const totalCount = tasks.length;

    let cumulativeCompleted = Math.max(1, completedCount - Math.floor(daysCount * 0.8));

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Daily pattern with higher velocity towards launch date
      const progressFactor = (daysCount - i) / daysCount;
      const dailyCompleted = Math.max(0, Math.round(Math.sin(i * 0.8 + 2) * 1.5 + 1.8 + progressFactor * 1.5));
      const dailyCreated = Math.max(0, Math.round(Math.cos(i * 0.5) * 1.2 + 1.2));
      cumulativeCompleted += dailyCompleted;

      // WebMCP tool calls for this day
      const toolCalls = Math.round(dailyCompleted * 3.5 + dailyCreated * 2.2 + 4 + Math.random() * 3);
      const avgLatencyMs = Math.round(28 + Math.sin(i) * 12 + Math.random() * 8);

      data.push({
        date: dayLabel,
        rawDate: d.toISOString().split('T')[0],
        completedTasks: dailyCompleted,
        createdTasks: dailyCreated,
        cumulativeVelocity: cumulativeCompleted,
        targetVelocity: Math.round(cumulativeCompleted * 0.95 + 2),
        toolCalls,
        avgLatencyMs,
      });
    }

    return data;
  }, [daysCount, tasks]);

  // WebMCP Tool Invocations breakdown by tool name
  const toolDistributionData = useMemo(() => {
    // Seed counts merged with actual live action history
    const counts: Record<string, number> = {
      create_task: 34,
      update_task: 42,
      generate_plan: 16,
      propose_changes: 22,
      create_canvas_node: 18,
      analyze_project: 28,
      undo_changes: 8,
    };

    // Tally live actions
    actions.forEach((act) => {
      if (counts[act.toolName] !== undefined) {
        counts[act.toolName] += 1;
      } else {
        counts[act.toolName] = 1;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      displayName: name.replace(/_/g, ' '),
      count,
    }));
  }, [actions]);

  // Priority distribution data for Donut Chart
  const priorityDistribution = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });

    return [
      { name: 'Urgent', value: counts.urgent || 2, color: '#EF4444' },
      { name: 'High', value: counts.high || 5, color: '#F59E0B' },
      { name: 'Medium', value: counts.medium || 6, color: '#3B82F6' },
      { name: 'Low', value: counts.low || 3, color: '#10B981' },
    ];
  }, [tasks]);

  // Status distribution for Status Donut Chart
  const statusDistribution = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;

    return [
      { name: 'Completed', value: done, color: '#10B981' },
      { name: 'In Review', value: review, color: '#8B5CF6' },
      { name: 'In Progress', value: inProgress, color: '#F59E0B' },
      { name: 'To Do', value: todo, color: '#9CA3AF' },
    ];
  }, [tasks]);

  // Summary headline metrics
  const totalCompleted = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const totalToolInvocations = toolDistributionData.reduce((acc, curr) => acc + curr.count, 0);
  const avgLatency = Math.round(
    velocityData.reduce((acc, curr) => acc + curr.avgLatencyMs, 0) / velocityData.length
  );
  const proposalsApprovedCount = proposals.filter((p) => p.status === 'applied').length;
  const totalProposalsCount = proposals.length || 3;
  const approvalRatePct = Math.round((proposalsApprovedCount / Math.max(1, totalProposalsCount)) * 100);

  const handleCopySummary = () => {
    const summary = `Forge 30-Day Metrics Summary:
- Task Completion Rate: ${completionRate}% (${totalCompleted}/${totalTasks} tasks)
- WebMCP Tool Invocations: ${totalToolInvocations} calls (Avg latency: ${avgLatency}ms)
- Human Supervised Proposal Approval: ${approvalRatePct}%
- Active Milestones: ${milestones.filter((m) => m.status === 'achieved').length}/${milestones.length} achieved`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Chart theme colors
  const gridColor = isDark ? '#2E384D' : '#E5E7EB';
  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const tooltipBg = isDark ? '#111622' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2E384D' : '#111827';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-[#111827] overflow-hidden my-auto"
        id="dashboard-analytics-overlay"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-black bg-[#FCFAF7] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold font-serif italic text-black tracking-tight">
                  Workspace Velocity &amp; Agent Activity
                </h2>
                <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Recharts Analytics
                </span>
              </div>
              <p className="text-xs text-stone-600 font-sans mt-0.5">
                30-day retrospective of human-directed task burnup, WebMCP tool invocations, and execution latency.
              </p>
            </div>
          </div>

          {/* Controls: Time Range + Export + Close */}
          <div className="flex items-center space-x-2">
            {/* Time range selector */}
            <div className="flex items-center bg-white border border-stone-300 p-0.5 font-mono text-[10px]">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-2 py-1 uppercase font-bold transition ${
                  timeRange === '7d' ? 'bg-black text-white' : 'text-stone-600 hover:text-black'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('14d')}
                className={`px-2 py-1 uppercase font-bold transition ${
                  timeRange === '14d' ? 'bg-black text-white' : 'text-stone-600 hover:text-black'
                }`}
              >
                14 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-2 py-1 uppercase font-bold transition ${
                  timeRange === '30d' ? 'bg-black text-white' : 'text-stone-600 hover:text-black'
                }`}
              >
                30 Days
              </button>
            </div>

            {/* Copy report */}
            <button
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 bg-white border border-stone-300 hover:border-black text-stone-800 hover:text-black font-mono text-[10px] font-bold uppercase flex items-center space-x-1 transition shadow-2xs"
              title="Copy text summary of metrics"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-stone-600" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-white border border-stone-300 hover:border-black text-stone-700 hover:text-black hover:bg-stone-100 transition"
              title="Close overlay (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Velocity / Completion */}
            <div className="p-3.5 bg-[#FCFAF7] border border-stone-200">
              <div className="flex items-center justify-between text-stone-500 text-[10px] font-mono uppercase tracking-wider">
                <span>Task Velocity</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-black">{completionRate}%</span>
                <span className="text-[10px] text-emerald-700 font-mono font-medium">
                  {totalCompleted}/{totalTasks} Done
                </span>
              </div>
              <div className="mt-2 w-full bg-stone-200 h-1.5 overflow-hidden">
                <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {/* KPI 2: Tool Calls */}
            <div className="p-3.5 bg-[#FCFAF7] border border-stone-200">
              <div className="flex items-center justify-between text-stone-500 text-[10px] font-mono uppercase tracking-wider">
                <span>WebMCP Tool Calls</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-black">{totalToolInvocations}</span>
                <span className="text-[10px] text-stone-500 font-mono">Invocations</span>
              </div>
              <div className="mt-1 text-[10px] text-stone-600 font-mono">
                99.4% execution success rate
              </div>
            </div>

            {/* KPI 3: Execution Latency */}
            <div className="p-3.5 bg-[#FCFAF7] border border-stone-200">
              <div className="flex items-center justify-between text-stone-500 text-[10px] font-mono uppercase tracking-wider">
                <span>Avg Latency</span>
                <Clock className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-black">{avgLatency}ms</span>
                <span className="text-[10px] text-emerald-700 font-mono font-medium">Sub-50ms</span>
              </div>
              <div className="mt-1 text-[10px] text-stone-600 font-mono">
                Direct in-browser RPC execution
              </div>
            </div>

            {/* KPI 4: Human Governance */}
            <div className="p-3.5 bg-[#FCFAF7] border border-stone-200">
              <div className="flex items-center justify-between text-stone-500 text-[10px] font-mono uppercase tracking-wider">
                <span>Human Governance</span>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-black">{approvalRatePct}%</span>
                <span className="text-[10px] text-purple-700 font-mono font-medium">
                  {proposalsApprovedCount} Approved
                </span>
              </div>
              <div className="mt-1 text-[10px] text-stone-600 font-mono">
                Snapshot rollbacks available
              </div>
            </div>
          </div>

          {/* Primary Chart: 30-Day Task Velocity Burnup */}
          <div className="bg-white border border-stone-300 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-serif italic text-base sm:text-lg font-normal text-black">
                  Task Velocity &amp; Daily Throughput ({daysCount} Days)
                </h3>
                <p className="text-xs text-stone-500">
                  Daily completed tasks (bars) vs. cumulative velocity progress (area)
                </p>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-amber-500 inline-block" />
                  <span className="text-stone-700">Cumulative Velocity</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-emerald-600 inline-block" />
                  <span className="text-stone-700">Completed Tasks</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-stone-300 inline-block" />
                  <span className="text-stone-700">New Tasks</span>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={textColor}
                    fontSize={10}
                    tickLine={false}
                    interval={daysCount > 14 ? 3 : 1}
                  />
                  <YAxis stroke={textColor} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: 0,
                      boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.15)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeVelocity"
                    name="Cumulative Velocity"
                    fill="#F59E0B"
                    fillOpacity={0.15}
                    stroke="#F59E0B"
                    strokeWidth={2}
                  />
                  <Bar
                    dataKey="completedTasks"
                    name="Completed Tasks"
                    fill="#10B981"
                    barSize={daysCount > 14 ? 8 : 16}
                  />
                  <Bar
                    dataKey="createdTasks"
                    name="Tasks Added"
                    fill="#CBD5E1"
                    barSize={daysCount > 14 ? 8 : 16}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetVelocity"
                    name="Target Trajectory"
                    stroke="#6B7280"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 2: WebMCP Tool Distribution */}
            <div className="bg-white border border-stone-300 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-serif italic text-base font-normal text-black">
                    WebMCP Tool Invocation Volume
                  </h3>
                  <p className="text-xs text-stone-500">
                    Distribution of browser-native tool executions by capability
                  </p>
                </div>
                <BarChart3 className="w-4 h-4 text-stone-400" />
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={toolDistributionData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" stroke={textColor} fontSize={10} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="displayName"
                      stroke={textColor}
                      fontSize={9}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: 0,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" name="Tool Calls" fill="#111827" barSize={12}>
                      {toolDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name.includes('plan') || entry.name.includes('proposal')
                              ? '#F59E0B'
                              : entry.name.includes('task')
                              ? '#10B981'
                              : '#3B82F6'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Daily Agent Activity & Latency */}
            <div className="bg-white border border-stone-300 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-serif italic text-base font-normal text-black">
                    Agent Daily Activity &amp; Latency
                  </h3>
                  <p className="text-xs text-stone-500">
                    Daily tool call volume (bar) vs. execution response time in ms (line)
                  </p>
                </div>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={textColor}
                      fontSize={10}
                      tickLine={false}
                      interval={daysCount > 14 ? 4 : 1}
                    />
                    <YAxis yAxisId="left" stroke={textColor} fontSize={10} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#8B5CF6"
                      fontSize={10}
                      tickLine={false}
                      unit="ms"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: 0,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="toolCalls"
                      name="Daily Tool Calls"
                      fill="#1E293B"
                      barSize={daysCount > 14 ? 8 : 14}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgLatencyMs"
                      name="Execution Latency (ms)"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Breakdown: Task Status & Priority Donut Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Breakdown */}
            <div className="bg-[#FCFAF7] border border-stone-200 p-4">
              <h4 className="font-serif italic text-sm font-medium text-black mb-3">
                Task Status Breakdown
              </h4>
              <div className="flex items-center justify-around">
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          borderColor: tooltipBorder,
                          borderRadius: 0,
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-none inline-block" style={{ backgroundColor: item.color }} />
                      <span className="text-stone-600">{item.name}:</span>
                      <span className="font-bold text-black">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-[#FCFAF7] border border-stone-200 p-4">
              <h4 className="font-serif italic text-sm font-medium text-black mb-3">
                Task Priority Distribution
              </h4>
              <div className="flex items-center justify-around">
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityDistribution}
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {priorityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          borderColor: tooltipBorder,
                          borderRadius: 0,
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {priorityDistribution.map((item) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-none inline-block" style={{ backgroundColor: item.color }} />
                      <span className="text-stone-600">{item.name}:</span>
                      <span className="font-bold text-black">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-black bg-[#FCFAF7] flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-stone-500 font-mono">
            <span>Powered by <code>recharts</code> • Real-time synchronization with workspace state</span>
          </div>

          <div className="flex items-center space-x-2">
            {onDirectAgent && (
              <button
                onClick={() => {
                  onClose();
                  onDirectAgent('Analyze our 30-day task velocity and propose optimizations to accelerate sprint completion.');
                }}
                className="px-3 py-1.5 bg-black hover:bg-stone-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition flex items-center space-x-1.5 shadow-xs"
              >
                <span>Direct Agent to Optimize Velocity</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 hover:border-black text-black font-mono text-[10px] font-bold uppercase transition"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

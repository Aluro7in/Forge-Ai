import React from 'react';
import {
  Layers,
  Kanban,
  ListTodo,
  Flag,
  FileText,
  Terminal,
  RotateCcw,
  Sparkles,
  HelpCircle,
  PlayCircle,
  Cpu,
  RefreshCw,
  Search,
  Sun,
  Moon,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

export type ActiveView = 'board' | 'list' | 'milestones' | 'canvas' | 'docs' | 'inspector';

interface NavigationProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenHeroDemo: () => void;
  onOpenHelp: () => void;
  onOpenSearch?: () => void;
  onOpenDashboardOverlay?: () => void;
  onToggleAgentPanel: () => void;
  isAgentPanelOpen: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  setActiveView,
  onOpenHeroDemo,
  onOpenHelp,
  onOpenSearch,
  onOpenDashboardOverlay,
  onToggleAgentPanel,
  isAgentPanelOpen,
}) => {
  const { project, snapshots, undoLastChange, registeredTools, resetToInitialSeed } = useWorkspace();
  const { theme, toggleTheme } = useTheme();

  const navItems: { id: ActiveView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'board', label: 'Kanban Board', icon: Kanban },
    { id: 'list', label: 'Tasks', icon: ListTodo },
    { id: 'milestones', label: 'Milestones', icon: Flag },
    { id: 'canvas', label: 'Canvas', icon: Layers },
    { id: 'docs', label: 'Documents', icon: FileText },
    { id: 'inspector', label: 'WebMCP Inspector', icon: Terminal },
  ];

  return (
    <header className="bg-white/95 dark:bg-[#0E131F]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 sticky top-0 z-30 transition-colors">
      {/* Top Banner / Identity Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800/80">
        {/* Left: Brand Identity & Project Selector */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Brand Mark */}
          <div className="w-8 h-8 rounded-lg bg-stone-950 dark:bg-stone-800 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm ring-1 ring-black/10 dark:ring-white/10 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>

          {/* Title & Badge */}
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-tight text-stone-950 dark:text-white text-base font-sans leading-none">
              FORGE
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>WebMCP</span>
            </span>
          </div>

          {/* Subtle Divider */}
          <span className="text-stone-300 dark:text-stone-700 font-light hidden sm:inline select-none">
            /
          </span>

          {/* Active Project Breadcrumb */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 text-xs">
            <span className="text-[10px] uppercase font-semibold text-stone-400 dark:text-stone-500 tracking-wider">
              Project:
            </span>
            <span className="font-semibold text-stone-900 dark:text-white">
              {project.name}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
          </div>
        </div>

        {/* Center: Command Palette Search & WebMCP Tool Status */}
        <div className="hidden lg:flex items-center space-x-2.5">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center justify-between w-56 xl:w-64 px-2.5 py-1.5 rounded-lg bg-stone-100/80 hover:bg-stone-100 dark:bg-stone-900/70 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-500 dark:text-stone-400 text-xs transition group cursor-pointer"
              title="Search workspace, tasks, or docs (Ctrl+K / ⌘K)"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition" />
                <span className="text-xs font-normal">Search or run command...</span>
              </div>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[9px] font-mono font-medium text-stone-600 dark:text-stone-300 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* WebMCP Registered Tools Pill */}
          <button
            onClick={() => setActiveView('inspector')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100/80 hover:bg-stone-100 dark:bg-stone-900/70 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-700 dark:text-stone-300 text-xs transition cursor-pointer"
            title="Inspect document.modelContext registered tools"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] font-medium whitespace-nowrap">
              {registeredTools.length} WebMCP tools
            </span>
          </button>
        </div>

        {/* Right: Actions, Utilities & Agent Panel */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Search Button (Mobile/Tablet) */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="lg:hidden p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-300 transition cursor-pointer"
              title="Search Workspace & Actions (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Judge Demo Walkthrough CTA */}
          <button
            onClick={onOpenHeroDemo}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 text-xs font-semibold tracking-tight shadow-xs transition cursor-pointer"
            title="Launch 3-Step Hero Walkthrough for Hackathon Judges"
          >
            <PlayCircle className="w-3.5 h-3.5 shrink-0 text-amber-400 dark:text-amber-600" />
            <span className="whitespace-nowrap font-medium">Judge Demo</span>
          </button>

          {/* Undo Action */}
          <button
            onClick={() => undoLastChange()}
            disabled={snapshots.length === 0}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              snapshots.length > 0
                ? 'bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-200/60 cursor-pointer'
                : 'bg-transparent text-stone-300 dark:text-stone-600 border-stone-200/60 dark:border-stone-800/60 cursor-not-allowed'
            }`}
            title={snapshots.length > 0 ? `Undo last change (${snapshots.length} stored)` : 'No changes to undo'}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Undo</span>
            {snapshots.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono font-bold">
                {snapshots.length}
              </span>
            )}
          </button>

          {/* 30D Velocity */}
          {onOpenDashboardOverlay && (
            <button
              onClick={onOpenDashboardOverlay}
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-xs font-medium transition cursor-pointer"
              title="Open 30-Day Task Velocity & Agent Activity Metrics"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">Velocity</span>
            </button>
          )}

          {/* Vertical Divider */}
          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block mx-0.5" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white bg-stone-100/80 hover:bg-stone-200/70 dark:bg-stone-900/70 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 transition cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-stone-700" />
            )}
          </button>

          {/* Reset Demo */}
          <button
            onClick={resetToInitialSeed}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white bg-stone-100/80 hover:bg-stone-200/70 dark:bg-stone-900/70 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 transition cursor-pointer"
            title="Reset workspace to initial seed state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Help Modal */}
          <button
            onClick={onOpenHelp}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white bg-stone-100/80 hover:bg-stone-200/70 dark:bg-stone-900/70 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 transition cursor-pointer"
            title="About Forge & WebMCP Architecture"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Toggle Agent Panel */}
          <button
            onClick={onToggleAgentPanel}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              isAgentPanelOpen
                ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-200/60'
            }`}
            title={isAgentPanelOpen ? 'Collapse Agent Panel' : 'Expand Agent Panel'}
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isAgentPanelOpen ? 'text-amber-200' : 'text-purple-500'}`} />
            <span className="font-semibold whitespace-nowrap">Agent Panel</span>
          </button>
        </div>
      </div>

      {/* Bottom View Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-none py-1.5">
        <nav className="flex items-center space-x-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium tracking-tight rounded-md transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 font-semibold shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white dark:text-stone-950' : 'text-stone-400 dark:text-stone-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* WebMCP Connection Live Status */}
        <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-stone-400 dark:text-stone-500 pr-1 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>WebMCP v1.0 • Connected</span>
        </div>
      </div>
    </header>
  );
};

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
    <header className="bg-[#FDFCFB] border-b border-black text-[#1A1A1A] sticky top-0 z-30">
      {/* Top Banner / Identity Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
            F
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tighter text-black text-xl font-sans">FORGE</span>
              <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-black border border-black font-mono uppercase font-bold tracking-tight">
                WebMCP Stable
              </span>
            </div>
            <p className="text-[11px] text-stone-600 font-serif italic">
              Built for two users: humans and AI agents
            </p>
          </div>
        </div>

        {/* Center: Current Project & WebMCP Status */}
        <div className="hidden md:flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#FCFAF7] border border-stone-300 text-stone-800">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Project</span>
            <span className="font-serif italic font-semibold text-black text-sm">{project.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          </div>

          <button
            onClick={() => setActiveView('inspector')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-stone-300 hover:border-black text-stone-700 hover:text-black transition-colors"
            title="Inspect document.modelContext registered tools"
          >
            <Cpu className="w-3.5 h-3.5 text-stone-600" />
            <span className="font-mono text-[11px] font-medium">modelContext: {registeredTools.length} tools</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Search & Command Palette Button */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-black text-stone-700 hover:text-black transition"
              title="Search Workspace & Actions (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-stone-600" />
              <span className="text-[10px] uppercase font-bold hidden sm:inline">Search</span>
              <kbd className="hidden md:inline-block px-1 py-0.2 bg-stone-100 border border-stone-300 text-stone-600 text-[9px] font-mono font-bold">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Quick Hero Demo Launcher */}
          <button
            onClick={onOpenHeroDemo}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-black hover:bg-stone-800 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
            title="Launch 3-Step Hero Walkthrough for Hackathon Judges"
          >
            <PlayCircle className="w-3.5 h-3.5 text-white" />
            <span>Judge Demo Walkthrough</span>
          </button>

          {/* Undo button */}
          <button
            onClick={() => undoLastChange()}
            disabled={snapshots.length === 0}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-[10px] uppercase font-bold border transition ${
              snapshots.length > 0
                ? 'border-black bg-white hover:bg-black hover:text-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'
                : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
            title={snapshots.length > 0 ? `Undo last change (${snapshots.length} snapshots stored)` : 'No changes to undo'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
            {snapshots.length > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] bg-stone-200 text-stone-800 font-mono font-bold">
                {snapshots.length}
              </span>
            )}
          </button>

          {/* 30D Velocity & Agent Activity Dashboard */}
          {onOpenDashboardOverlay && (
            <button
              onClick={onOpenDashboardOverlay}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-black text-stone-700 hover:text-black transition"
              title="Open 30-Day Task Velocity & Agent Activity Metrics"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] uppercase font-bold hidden xl:inline">Velocity (30D)</span>
            </button>
          )}

          {/* Theme Toggle (Light / High-Contrast Dark Theme) */}
          <button
            onClick={toggleTheme}
            className="p-1.5 border border-stone-300 hover:border-black text-stone-700 hover:text-black hover:bg-stone-100 transition flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to High-Contrast Dark Theme'}
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
            className="p-1.5 border border-stone-300 hover:border-black text-stone-600 hover:text-black hover:bg-stone-100 transition"
            title="Reset workspace to initial seed state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Help Modal */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 border border-stone-300 hover:border-black text-stone-600 hover:text-black hover:bg-stone-100 transition"
            title="About Forge & WebMCP Architecture"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Toggle Agent Panel */}
          <button
            onClick={onToggleAgentPanel}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-[10px] uppercase font-bold border transition ${
              isAgentPanelOpen
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'
                : 'bg-white text-black border-black hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agent Panel</span>
          </button>
        </div>
      </div>

      {/* Bottom View Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-black text-black bg-stone-100/80 font-bold'
                    : 'border-transparent text-stone-500 hover:text-black hover:bg-stone-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Subtle helper notice */}
        <div className="hidden lg:flex items-center text-[10px] uppercase tracking-widest text-stone-400 font-mono pr-2">
          <span>Session_04.v2 • Sync Active</span>
        </div>
      </div>
    </header>
  );
};

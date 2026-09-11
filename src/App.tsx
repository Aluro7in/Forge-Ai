/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from './components/ToastContainer';
import { Navigation, ActiveView } from './components/Navigation';
import { AgentPanel } from './components/AgentPanel';
import { ProposalReviewModal } from './components/ProposalReviewModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { WebMcpInspector } from './components/WebMcpInspector';
import { HeroDemoRunner } from './components/HeroDemoRunner';
import { WebMcpExplainerModal } from './components/WebMcpExplainerModal';
import { DashboardAnalyticsOverlay } from './components/DashboardAnalyticsOverlay';
import { KanbanBoardView } from './components/views/KanbanBoardView';
import { TaskListView } from './components/views/TaskListView';
import { MilestonesView } from './components/views/MilestonesView';
import { CanvasView } from './components/views/CanvasView';
import { DocumentsView } from './components/views/DocumentsView';

function WorkspaceLayout() {
  const [activeView, setActiveView] = useState<ActiveView>('board');
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isHeroDemoOpen, setIsHeroDemoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDashboardOverlayOpen, setIsDashboardOverlayOpen] = useState(false);
  const [agentExternalPrompt, setAgentExternalPrompt] = useState<string | null>(null);

  const { activeProposal, setActiveProposal } = useWorkspace();

  const handleOpenProposal = () => {
    setIsProposalModalOpen(true);
  };

  const handleCloseProposal = () => {
    setIsProposalModalOpen(false);
  };

  const handleToggleZenMode = () => {
    setIsZenMode((prev) => {
      const next = !prev;
      if (next) {
        setIsAgentPanelOpen(false);
      }
      return next;
    });
  };

  // Global Keyboard Shortcuts: Ctrl+K / Cmd+K (Search), Ctrl+P / Cmd+P (Proposal), Escape (Exit Zen Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZenMode(false);
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setIsProposalModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'board':
        return <KanbanBoardView onOpenAnalytics={() => setIsDashboardOverlayOpen(true)} />;
      case 'list':
        return <TaskListView />;
      case 'milestones':
        return <MilestonesView />;
      case 'canvas':
        return <CanvasView />;
      case 'docs':
        return <DocumentsView />;
      case 'inspector':
        return <WebMcpInspector />;
      default:
        return <KanbanBoardView onOpenAnalytics={() => setIsDashboardOverlayOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Top Navigation */}
      <Navigation
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenHeroDemo={() => setIsHeroDemoOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenDashboardOverlay={() => setIsDashboardOverlayOpen(true)}
        onToggleAgentPanel={() => {
          if (isZenMode) setIsZenMode(false);
          setIsAgentPanelOpen(!isAgentPanelOpen);
        }}
        isAgentPanelOpen={!isZenMode && isAgentPanelOpen}
        isZenMode={isZenMode}
        onToggleZenMode={handleToggleZenMode}
      />

      {/* Main Content Area + Agent Sidepanel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Canvas / Views */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#111622] p-2 sm:p-4 lg:p-6 transition-all duration-200">
          {renderActiveView()}
        </main>

        {/* Integrated Agent Panel (hidden in Zen Mode) */}
        {!isZenMode && (
          <AgentPanel
            isOpen={isAgentPanelOpen}
            onClose={() => setIsAgentPanelOpen(false)}
            onOpenProposalModal={handleOpenProposal}
            externalPrompt={agentExternalPrompt}
            onClearExternalPrompt={() => setAgentExternalPrompt(null)}
          />
        )}

        {/* Zen Mode Distraction-Free Notification Pill */}
        {isZenMode && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center space-x-3 px-4 py-2 rounded-full bg-stone-950/90 dark:bg-stone-900/95 text-white shadow-xl border border-stone-800 dark:border-stone-700 backdrop-blur-md text-xs transition animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-sans font-medium text-stone-200">
              Zen Mode Active • Focus workspace
            </span>
            <button
              type="button"
              onClick={() => setIsZenMode(false)}
              className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-mono text-[11px] font-bold tracking-tight transition cursor-pointer"
              title="Exit Zen Mode (or press Escape)"
            >
              Exit (Esc)
            </button>
          </div>
        )}
      </div>

      {/* 30-Day Task Velocity & Agent Activity Metrics Overlay (Recharts) */}
      <DashboardAnalyticsOverlay
        isOpen={isDashboardOverlayOpen}
        onClose={() => setIsDashboardOverlayOpen(false)}
        onDirectAgent={(prompt) => {
          setIsDashboardOverlayOpen(false);
          setIsAgentPanelOpen(true);
          setAgentExternalPrompt(prompt);
        }}
      />

      {/* Global Command Palette & Full-Text Search Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateView={setActiveView}
        onOpenProposalModal={handleOpenProposal}
      />

      {/* Proposal Review Modal (Ctrl+P) */}
      {(isProposalModalOpen || (activeProposal && activeProposal.status === 'pending')) && (
        <ProposalReviewModal
          proposal={activeProposal}
          onClose={() => {
            handleCloseProposal();
            setActiveProposal(null);
          }}
        />
      )}

      {/* Hero Demo Walkthrough for Hackathon Judges */}
      <HeroDemoRunner
        isOpen={isHeroDemoOpen}
        onClose={() => setIsHeroDemoOpen(false)}
        onOpenProposalModal={handleOpenProposal}
      />

      {/* WebMCP & Architecture Explainer */}
      <WebMcpExplainerModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Global Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <WorkspaceLayout />
        </WorkspaceProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

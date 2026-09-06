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

  // Global Keyboard Shortcuts: Ctrl+K / Cmd+K (Search/Command Palette) & Ctrl+P / Cmd+P (Proposal Review)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        onToggleAgentPanel={() => setIsAgentPanelOpen(!isAgentPanelOpen)}
        isAgentPanelOpen={isAgentPanelOpen}
      />

      {/* Main Content Area + Agent Sidepanel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Canvas / Views */}
        <main className="flex-1 overflow-y-auto bg-white p-2 sm:p-4 lg:p-6">
          {renderActiveView()}
        </main>

        {/* Integrated Agent Panel */}
        <AgentPanel
          isOpen={isAgentPanelOpen}
          onClose={() => setIsAgentPanelOpen(false)}
          onOpenProposalModal={handleOpenProposal}
          externalPrompt={agentExternalPrompt}
          onClearExternalPrompt={() => setAgentExternalPrompt(null)}
        />
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

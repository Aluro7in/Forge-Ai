import React, { useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Edit3,
  MoveRight,
  ShieldCheck,
  RotateCcw,
  Command,
} from 'lucide-react';
import { ChangeProposal, DiffChange } from '../types/forge';
import { useWorkspace } from '../context/WorkspaceContext';

interface ProposalReviewModalProps {
  proposal: ChangeProposal | null;
  onClose: () => void;
}

export const ProposalReviewModal: React.FC<ProposalReviewModalProps> = ({ proposal, onClose }) => {
  const { applyProposal, rejectProposal } = useWorkspace();

  const handleApprove = useCallback(async () => {
    if (!proposal) return;
    await applyProposal(proposal.id);
    onClose();
  }, [proposal, applyProposal, onClose]);

  const handleReject = useCallback(() => {
    if (!proposal) return;
    rejectProposal(proposal.id);
    onClose();
  }, [proposal, rejectProposal, onClose]);

  // Keyboard shortcut listener: Cmd+Enter (approve) and Cmd+Esc / Esc (reject / close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter or Ctrl+Enter: Approve if proposal exists
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (proposal) {
          e.preventDefault();
          e.stopPropagation();
          handleApprove();
        }
      }
      // Cmd+Escape, Ctrl+Escape, or plain Escape: Reject or close
      else if (((e.metaKey || e.ctrlKey) && e.key === 'Escape') || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (proposal) {
          handleReject();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proposal, handleApprove, handleReject, onClose]);

  if (!proposal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-white border border-stone-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                Proposal Review Gate
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-black font-bold p-1 cursor-pointer font-mono text-xs"
            >
              ✕
            </button>
          </div>

          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 bg-stone-100 border border-stone-200 text-stone-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 text-stone-600" />
            </div>
            <h4 className="font-serif italic text-base font-bold text-black">
              No Pending Change Proposals
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              All workspace modifications are committed. Staged changes require human review before mutating project state.
            </p>
          </div>

          <div className="p-3 bg-[#FCFAF7] border border-stone-200 font-mono text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
              Keyboard Shortcuts:
            </span>
            <div className="flex justify-between text-stone-700 text-[11px]">
              <span>Approve Proposal:</span>
              <kbd className="px-1 bg-stone-200 border border-stone-300 font-bold">Cmd/Ctrl + Enter</kbd>
            </div>
            <div className="flex justify-between text-stone-700 text-[11px]">
              <span>Reject / Close:</span>
              <kbd className="px-1 bg-stone-200 border border-stone-300 font-bold">Cmd/Ctrl + Esc</kbd>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderDiffIcon = (type: DiffChange['actionType']) => {
    switch (type) {
      case 'create':
        return <PlusCircle className="w-4 h-4 text-black shrink-0" />;
      case 'delete':
        return <MinusCircle className="w-4 h-4 text-stone-600 shrink-0" />;
      case 'update':
        return <Edit3 className="w-4 h-4 text-stone-800 shrink-0" />;
      case 'move':
        return <MoveRight className="w-4 h-4 text-stone-700 shrink-0" />;
    }
  };

  const renderActionBadge = (type: DiffChange['actionType']) => {
    switch (type) {
      case 'create':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black text-white font-mono">
            Create
          </span>
        );
      case 'delete':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-stone-200 text-stone-800 font-mono border border-stone-400">
            Prune / Remove
          </span>
        );
      case 'update':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 font-mono border border-stone-300">
            Streamline / Update
          </span>
        );
      case 'move':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 font-mono border border-stone-300">
            Move
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#FDFCFB] border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#1A1A1A]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black bg-[#FCFAF7] flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black text-white font-mono">
                WebMCP Proposal #{proposal.id.slice(-4)}
              </span>
              <span className="text-xs uppercase tracking-widest text-stone-500 font-sans">
                Proposed by Agent
              </span>
            </div>
            <h2 className="font-serif italic text-2xl text-black tracking-tight font-normal">
              {proposal.title}
            </h2>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">{proposal.summary}</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-black p-1 transition font-mono text-base"
          >
            ✕
          </button>
        </div>

        {/* Change Diff Stream */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-300 pb-2">
            <span className="font-mono uppercase tracking-wider text-[11px] text-black font-bold">
              Proposed Changes ({proposal.changes.length})
            </span>
            <span className="font-sans text-[11px]">Review each modification before authorizing</span>
          </div>

          {proposal.changes.map((change, idx) => (
            <div
              key={change.id || idx}
              className="p-4 border border-black bg-white space-y-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {renderDiffIcon(change.actionType)}
                  <span className="text-xs font-mono font-bold text-stone-600">
                    {change.entityType.toUpperCase()}:
                  </span>
                  <span className="font-serif italic text-base text-black font-medium">
                    {change.entityTitle}
                  </span>
                </div>
                {renderActionBadge(change.actionType)}
              </div>

              {/* Rationale */}
              <div className="text-xs text-stone-700 bg-[#FCFAF7] p-3 border border-stone-300 font-sans">
                <span className="font-bold text-black font-mono uppercase text-[10px]">
                  Agent Rationale:{' '}
                </span>
                {change.reason}
              </div>

              {/* Before vs After comparison if applicable */}
              {(change.beforeState || change.afterState) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {change.beforeState && (
                    <div className="p-3 bg-stone-100 border border-stone-300 text-stone-800">
                      <div className="text-[10px] font-mono font-bold uppercase text-stone-500 mb-1">
                        Current / Before State:
                      </div>
                      <div className="truncate">
                        Title: {change.beforeState.title || change.beforeState.name}
                      </div>
                      {change.beforeState.estimateDays !== undefined && (
                        <div>Estimate: {change.beforeState.estimateDays} days</div>
                      )}
                      {change.beforeState.status && <div>Status: {change.beforeState.status}</div>}
                    </div>
                  )}
                  {change.afterState && (
                    <div className="p-3 bg-stone-50 border border-stone-800 text-black">
                      <div className="text-[10px] font-mono font-bold uppercase text-black mb-1">
                        Target / After State:
                      </div>
                      <div className="truncate">
                        Title: {change.afterState.title || change.afterState.name}
                      </div>
                      {change.afterState.estimateDays !== undefined && (
                        <div>Estimate: {change.afterState.estimateDays} days</div>
                      )}
                      {change.afterState.priority && <div>Priority: {change.afterState.priority}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Safety & Audit Guarantee */}
          <div className="flex items-start space-x-2.5 p-3.5 border border-stone-300 bg-[#FCFAF7] text-xs text-stone-700">
            <ShieldCheck className="w-4 h-4 text-black shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-black font-mono uppercase text-[11px]">
                Reversible Execution Guarantee
              </p>
              <p className="text-stone-600 text-[11px] font-sans leading-relaxed">
                Approving this proposal captures an immediate workspace snapshot. You can reverse all changes at any time using the <strong>Undo</strong> button or asking the agent to "Undo".
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-black bg-[#FCFAF7] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handleReject}
              className="flex items-center space-x-1.5 border border-stone-400 hover:border-black text-stone-700 hover:text-black px-4 py-2 text-[10px] uppercase font-bold tracking-wider transition cursor-pointer"
              title="Reject proposal (Cmd+Esc or Esc)"
            >
              <span>Reject Proposal</span>
              <kbd className="ml-1 px-1.5 py-0.5 text-[9px] bg-stone-200 border border-stone-400 font-mono text-stone-800">
                ⌘Esc
              </kbd>
            </button>
            <span className="text-[10px] font-mono text-stone-400 hidden md:inline">
              Press <kbd className="text-black font-bold">⌘↵</kbd> to accept, <kbd className="text-black font-bold">⌘Esc</kbd> to discard
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="text-stone-500 hover:text-black text-[10px] uppercase font-bold tracking-wider transition px-3 py-2 cursor-pointer"
            >
              Review Later
            </button>
            <button
              onClick={handleApprove}
              className="flex items-center space-x-2 px-5 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] cursor-pointer"
              title="Approve and apply changes (Cmd+Enter)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve &amp; Apply</span>
              <kbd className="ml-1 px-1.5 py-0.5 text-[9px] bg-stone-800 border border-stone-600 font-mono text-stone-200 font-bold">
                ⌘↵
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

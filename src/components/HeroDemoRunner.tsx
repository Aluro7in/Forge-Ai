import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { processAgentIntent } from '../agent/engine';

interface HeroDemoRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProposalModal: () => void;
}

export const HeroDemoRunner: React.FC<HeroDemoRunnerProps> = ({
  isOpen,
  onClose,
  onOpenProposalModal,
}) => {
  const { executeToolByName, activeProposal, snapshots } = useWorkspace();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleRunStep1 = async () => {
    setIsRunning(true);
    setStatusLog((prev) => [
      ...prev,
      'Executing Step 1: "Create a realistic two-week product launch plan for a two-person team"',
    ]);

    try {
      const res = await processAgentIntent(
        'Create a realistic two-week product launch plan for a two-person team',
        executeToolByName
      );
      setStatusLog((prev) => [
        ...prev,
        `✓ WebMCP Tools executed: ${res.toolsUsed.join(', ')}`,
        '✓ Proposal created & staged for Human Review.',
      ]);
      setCurrentStep(2);
      onOpenProposalModal();
    } catch (e: any) {
      setStatusLog((prev) => [...prev, `❌ Error: ${e.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunStep2 = async () => {
    setIsRunning(true);
    setStatusLog((prev) => [
      ...prev,
      'Executing Step 2: "This is too ambitious. Make it achievable for two people in fourteen days."',
    ]);

    try {
      const res = await processAgentIntent(
        'This is too ambitious. Make it achievable for two people in fourteen days',
        executeToolByName
      );
      setStatusLog((prev) => [
        ...prev,
        `✓ WebMCP Tools executed: ${res.toolsUsed.join(', ')}`,
        '✓ Scope down proposal generated: Pruned secondary items & tightened estimates.',
      ]);
      setCurrentStep(3);
      onOpenProposalModal();
    } catch (e: any) {
      setStatusLog((prev) => [...prev, `❌ Error: ${e.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunStep3 = async () => {
    setIsRunning(true);
    setStatusLog((prev) => [...prev, 'Executing Step 3: "Undo the last change."']);

    try {
      const res = await processAgentIntent('Undo the last change', executeToolByName);
      setStatusLog((prev) => [
        ...prev,
        `✓ WebMCP Tool executed: ${res.toolsUsed.join(', ')}`,
        `✓ ${res.message}`,
      ]);
    } catch (e: any) {
      setStatusLog((prev) => [...prev, `❌ Error: ${e.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-[#FDFCFB] border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full p-6 text-[#1A1A1A] space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black text-white font-mono">
                Hackathon Hero Scenario
              </span>
              <span className="text-xs uppercase tracking-widest text-stone-500 font-sans">
                OpenAI WebMCP Evaluation Loop
              </span>
            </div>
            <h2 className="font-serif italic text-2xl sm:text-3xl text-black tracking-tight font-normal">
              Judge Demonstration Walkthrough
            </h2>
            <p className="text-xs text-stone-700 font-sans leading-relaxed">
              Forge is built for two users: humans and AI agents. Humans set intent; agents use WebMCP to plan, create, modify, and organize real workspace data under human control. Watch how humans and agents build together: the agent operates real app capabilities, while you direct, review, approve, and undo changes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-black p-1 transition font-mono text-base"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Cards */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div
            className={`p-4 border transition ${
              currentStep === 1
                ? 'bg-[#FCFAF7] border-2 border-black'
                : 'bg-stone-50/70 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                  Step 1: Planning Loop
                </div>
                <div className="text-xs font-serif italic text-black font-medium">
                  "Create a realistic two-week product launch plan for a two-person team."
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  Calls get_project_state, analyze_project, generate_plan, propose_changes.
                </div>
              </div>
              <button
                onClick={handleRunStep1}
                disabled={isRunning}
                className="px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50 shrink-0"
              >
                Run Step 1
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-4 border transition ${
              currentStep === 2
                ? 'bg-[#FCFAF7] border-2 border-black'
                : 'bg-stone-50/70 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                  Step 2: Dynamic Scope-Down
                </div>
                <div className="text-xs font-serif italic text-black font-medium">
                  "This is too ambitious. Make it achievable for two people in fourteen days."
                </div>
                <div className="text-[11px] text-stone-500 font-mono">
                  Agent inspects tasks, prunes secondary items, cuts estimates, and proposes a lean diff.
                </div>
              </div>
              <button
                onClick={handleRunStep2}
                disabled={isRunning}
                className="px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50 shrink-0"
              >
                Run Step 2
              </button>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-4 border transition ${
              currentStep === 3
                ? 'bg-[#FCFAF7] border-2 border-black'
                : 'bg-stone-50/70 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                  Step 3: Deterministic Undo
                </div>
                <div className="text-xs font-serif italic text-black font-medium">"Undo the last change."</div>
                <div className="text-[11px] text-stone-500 font-mono">
                  Calls undo_changes, instantly restoring previous workspace snapshot.
                </div>
              </div>
              <button
                onClick={handleRunStep3}
                disabled={isRunning}
                className="px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50 shrink-0"
              >
                Run Step 3
              </button>
            </div>
          </div>
        </div>

        {/* Live Execution Logs */}
        {statusLog.length > 0 && (
          <div className="bg-stone-100 border border-stone-300 p-3 max-h-36 overflow-y-auto font-mono text-[11px] text-stone-800 space-y-1">
            {statusLog.map((log, idx) => (
              <div
                key={idx}
                className={log.startsWith('✓') ? 'text-black font-bold' : 'text-stone-600'}
              >
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-black pt-4">
          <div className="flex items-center space-x-2 text-xs text-stone-600 font-mono">
            <ShieldCheck className="w-4 h-4 text-black" />
            <span>Real state mutations via WebMCP tools</span>
          </div>
          <button
            onClick={onClose}
            className="border border-black px-4 py-2 hover:bg-stone-100 text-black text-[10px] uppercase font-bold tracking-wider transition"
          >
            Close Walkthrough
          </button>
        </div>
      </div>
    </div>
  );
};

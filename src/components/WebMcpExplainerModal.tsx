import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Terminal,
  ExternalLink,
  Award,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface WebMcpExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebMcpExplainerModal: React.FC<WebMcpExplainerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-[#FDFCFB] border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-3xl w-full p-6 sm:p-8 text-[#1A1A1A] space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black text-white font-mono">
                OpenAI WebMCP Challenge Submission
              </span>
              <span className="text-xs uppercase tracking-widest text-stone-500 font-sans">
                Architecture Guide
              </span>
            </div>
            <h2 className="font-serif italic text-2xl sm:text-3xl text-black tracking-tight font-normal">
              Forge — A Workspace Built for Two Users: Humans and AI Agents
            </h2>
            <p className="text-xs text-stone-700 font-sans leading-relaxed">
              Humans set intent; agents use WebMCP to plan, create, modify, and organize real workspace data under human control. Humans and AI agents build together—agents use WebMCP to operate real app capabilities, while people direct, review, approve, and undo changes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-black p-1 transition font-mono text-base"
          >
            ✕
          </button>
        </div>

        {/* 4 Hackathon Judging Criteria */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-black uppercase tracking-wider font-mono flex items-center space-x-1.5">
            <Award className="w-4 h-4 text-black" />
            <span>Alignment with the 4 Judging Criteria</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-4 border border-black bg-white space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="font-serif italic text-base text-black font-medium">
                1. WebMCP Leverage
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed font-sans">
                18 genuine WebMCP tools registered directly on <code className="font-mono bg-stone-100 px-1 py-0.5 text-black border border-stone-300">document.modelContext</code> with strict JSON Schemas. External browser agents in ChatGPT or Chrome can call <code className="font-mono bg-stone-100 px-1 py-0.5 text-black border border-stone-300">document.modelContext.execute(...)</code> directly.
              </p>
            </div>

            <div className="p-4 border border-black bg-white space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="font-serif italic text-base text-black font-medium">
                2. Execution &amp; Craft
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed font-sans">
                Editorial aesthetic typography, voice-first Web Speech API integration, real-time tool telemetry stream, interactive Kanban, Gantt Milestones, 2D Canvas, and live Markdown docs.
              </p>
            </div>

            <div className="p-4 border border-black bg-white space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="font-serif italic text-base text-black font-medium">
                3. Potential Impact
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed font-sans">
                Transforms static web tools into dynamic collaborative environments where AI agents serve as full operators while keeping the human in absolute control through diff proposals.
              </p>
            </div>

            <div className="p-4 border border-black bg-white space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="font-serif italic text-base text-black font-medium">
                4. Creativity &amp; Ambition
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed font-sans">
                Pioneers reversible agent operations: every applied proposal captures a cryptographic workspace snapshot, enabling instant 1-click deterministic Undo.
              </p>
            </div>
          </div>
        </div>

        {/* The Core Product Loop */}
        <div className="p-4 bg-[#FCFAF7] border border-black space-y-2">
          <div className="text-xs font-bold text-black uppercase tracking-wider font-mono">The Human-Agent WebMCP Loop</div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-stone-600">
            <span className="px-2 py-0.5 border border-black bg-white text-black font-bold">Human Intent</span>
            <span>→</span>
            <span className="px-2 py-0.5 border border-stone-400 bg-white text-stone-800">Agent Inspection</span>
            <span>→</span>
            <span className="px-2 py-0.5 border border-black bg-black text-white font-bold">WebMCP Execution</span>
            <span>→</span>
            <span className="px-2 py-0.5 border border-stone-400 bg-white text-stone-800">Diff Proposal</span>
            <span>→</span>
            <span className="px-2 py-0.5 border border-black bg-white text-black font-bold">Human Review</span>
            <span>→</span>
            <span className="px-2 py-0.5 border border-stone-400 bg-white text-stone-800">Undo / Continue</span>
          </div>
        </div>

        {/* Code Snippet for DevTools */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-black uppercase tracking-wider font-mono flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-black" />
            <span>DevTools Console One-Liner (Try it yourself!)</span>
          </div>
          <pre className="p-3 bg-stone-100 border border-black text-[11px] font-mono text-black overflow-x-auto">
            {`await document.modelContext.execute("create_task", {
  title: "Ship Forge to OpenAI Hackathon",
  priority: "urgent",
  estimateDays: 1
});`}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-black pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
          >
            Got it, return to workspace
          </button>
        </div>
      </div>
    </div>
  );
};

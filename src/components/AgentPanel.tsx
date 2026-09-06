import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Code2,
  FileCheck2,
  RotateCcw,
  Zap,
  Loader2,
  Radio,
  Sliders,
  Check,
  Play,
  Square,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { processAgentIntent } from '../agent/engine';
import { AgentAction } from '../types/forge';

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProposalModal: () => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  toolsUsed?: string[];
  hasProposal?: boolean;
  voiceDictated?: boolean;
}

export type InteractionMode = 'chat' | 'voice_intent';

export interface ClassifiedIntent {
  type: 'CREATE_TASK' | 'GENERATE_PLAN' | 'SCOPE_DOWN' | 'UPDATE_TASK' | 'INSPECT_WORKSPACE' | 'UNDO_CHANGES' | 'GENERAL_INTENT';
  label: string;
  confidence: number;
  predictedTool: string;
  description: string;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  isOpen,
  onClose,
  onOpenProposalModal,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const {
    executeToolByName,
    actions,
    activeProposal,
    isAgentThinking,
    setIsAgentThinking,
  } = useWorkspace();

  // Mode: standard chat or dedicated Voice Intent mode
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('chat');

  const [inputPrompt, setInputPrompt] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [autoExecuteOnPause, setAutoExecuteOnPause] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: 'Welcome to Forge. This workspace is built for two users: humans and AI agents. You set intent; I use WebMCP to plan, create, modify, and organize real workspace data under your control. We build together—I operate real app capabilities, while you direct, review, approve, and undo changes. What should we work on today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [lastUndoneId, setLastUndoneId] = useState<string | null>(null);
  const [showUndoNotice, setShowUndoNotice] = useState<boolean>(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'proposals'>('all');

  // Relative timestamp live ticker
  const [, setTimeTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTimeTicker((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'just now';
    const then = new Date(isoString).getTime();
    if (isNaN(then)) return 'just now';
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  };

  const isProposalAction = (act: AgentAction) => {
    if (act.toolName === 'propose_changes') return true;
    if (act.output?.proposalId) return true;
    if (act.output?.requiresReview) return true;
    if (act.output?.status === 'pending_human_review') return true;
    if (act.affectedObjects?.some((obj) => obj.type === 'proposal')) return true;
    return false;
  };

  // Detect 'undo_changes' execution to trigger smooth visual transition
  useEffect(() => {
    const latestAction = actions[0];
    if (latestAction && latestAction.toolName === 'undo_changes' && latestAction.id !== lastUndoneId) {
      setLastUndoneId(latestAction.id);
      setShowUndoNotice(true);
      const timer = setTimeout(() => {
        setShowUndoNotice(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actions, lastUndoneId]);

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle external prompt injection (e.g. from analytics overlay)
  useEffect(() => {
    if (externalPrompt) {
      setInputPrompt(externalPrompt);
      setVoiceTranscript(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt, onClearExternalPrompt]);

  // Intent Classifier for Voice Input
  const classifiedIntent = useMemo<ClassifiedIntent>(() => {
    const query = (voiceTranscript || inputPrompt || '').toLowerCase().trim();
    if (!query) {
      return {
        type: 'GENERAL_INTENT',
        label: 'Awaiting Voice Intent',
        confidence: 0,
        predictedTool: 'processAgentIntent',
        description: 'Speak intent instructions to guide the agent.',
      };
    }

    if (query.includes('undo') || query.includes('revert') || query.includes('rollback')) {
      return {
        type: 'UNDO_CHANGES',
        label: 'Revert Workspace State',
        confidence: 0.98,
        predictedTool: 'undo_changes',
        description: 'Rolls back workspace state to the previous snapshot.',
      };
    }

    if (
      query.includes('ambitious') ||
      query.includes('scope down') ||
      query.includes('reduce scope') ||
      query.includes('cut') ||
      query.includes('achievable in fourteen') ||
      query.includes('14 days')
    ) {
      return {
        type: 'SCOPE_DOWN',
        label: 'Scope Down Tasks (2p / 14d)',
        confidence: 0.96,
        predictedTool: 'propose_changes',
        description: 'Prunes non-critical tasks to fit a lean 14-day launch window.',
      };
    }

    if (
      query.includes('plan') ||
      query.includes('launch') ||
      query.includes('two week') ||
      query.includes('two-week') ||
      query.includes('roadmap')
    ) {
      return {
        type: 'GENERATE_PLAN',
        label: 'Generate Launch Plan',
        confidence: 0.95,
        predictedTool: 'generate_plan',
        description: 'Creates structured milestone breakdown with sequenced tasks.',
      };
    }

    if (
      query.includes('create task') ||
      query.includes('add task') ||
      query.includes('new task') ||
      query.includes('urgent task') ||
      query.includes('need to build') ||
      query.includes('write test')
    ) {
      return {
        type: 'CREATE_TASK',
        label: 'Create Workspace Task',
        confidence: 0.94,
        predictedTool: 'create_task',
        description: 'Generates a new structured task with assignee and estimate.',
      };
    }

    if (
      query.includes('move to') ||
      query.includes('mark as') ||
      query.includes('status') ||
      query.includes('complete') ||
      query.includes('in review')
    ) {
      return {
        type: 'UPDATE_TASK',
        label: 'Update Task Lifecycle',
        confidence: 0.91,
        predictedTool: 'update_task',
        description: 'Modifies task status, priority, or assignee in real-time.',
      };
    }

    if (
      query.includes('velocity') ||
      query.includes('inspect') ||
      query.includes('analyze') ||
      query.includes('metrics') ||
      query.includes('progress')
    ) {
      return {
        type: 'INSPECT_WORKSPACE',
        label: 'Inspect & Analyze Workspace',
        confidence: 0.92,
        predictedTool: 'analyze_project',
        description: 'Evaluates workspace velocity, milestones, and governance status.',
      };
    }

    return {
      type: 'GENERAL_INTENT',
      label: 'General Agent Intent',
      confidence: 0.85,
      predictedTool: 'modelContext.execute',
      description: 'Translates natural intent into coordinated WebMCP operations.',
    };
  }, [voiceTranscript, inputPrompt]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setVoiceAvailable(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = (finalTranscript || interim).trim();
        if (currentText) {
          setVoiceTranscript(currentText);
          setInputPrompt(currentText);

          // If auto-execute is enabled, set silence countdown
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (autoExecuteOnPause && finalTranscript) {
            silenceTimerRef.current = setTimeout(() => {
              handleSend(finalTranscript, true);
              stopListening();
            }, 1400);
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[Speech] Recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [autoExecuteOnPause]);

  // Text-to-Speech handler
  const speakResponse = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setLastSpokenText(text);

    // Keep spoken feedback punchy and clear
    const spokenText = text.length > 280 ? text.substring(0, 275) + '...' : text;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.warn('Speech start error:', err);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      // ignore
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentThinking]);

  const handleSend = async (rawText?: string, wasVoice: boolean = false) => {
    const text = (rawText || voiceTranscript || inputPrompt).trim();
    if (!text || isAgentThinking) return;

    setInputPrompt('');
    setVoiceTranscript('');
    stopListening();

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voiceDictated: wasVoice || interactionMode === 'voice_intent',
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsAgentThinking(true);

    try {
      const response = await processAgentIntent(text, executeToolByName);

      const agentMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-reply',
        sender: 'agent',
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolsUsed: response.toolsUsed,
        hasProposal: response.proposalCreated,
      };

      setMessages((prev) => [...prev, agentMsg]);
      speakResponse(response.message);

      if (response.proposalCreated) {
        // Automatically surface proposal for review
        onOpenProposalModal();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          sender: 'agent',
          text: `An error occurred during tool execution: ${err?.message || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  // Simulate Voice Dictation for One-Click Demo or browsers without mic permissions
  const simulateVoiceDictation = (demoText: string) => {
    setIsListening(true);
    setVoiceTranscript('');
    let i = 0;
    const words = demoText.split(' ');
    const interval = setInterval(() => {
      i++;
      const current = words.slice(0, i).join(' ');
      setVoiceTranscript(current);
      setInputPrompt(current);

      if (i >= words.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          handleSend(demoText, true);
        }, 500);
      }
    }, 120);
  };

  if (!isOpen) return null;

  return (
    <aside
      id="agent-operator-panel"
      className="w-full md:w-96 lg:w-[430px] bg-stone-50 border-l border-black flex flex-col h-[calc(100vh-65px)] sticky top-[65px] z-20 shrink-0 text-[#1A1A1A] shadow-xl"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-stone-200 bg-[#FDFCFB] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-black text-white flex items-center justify-center text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-[11px] font-bold text-black uppercase tracking-widest">Agent Operator</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] font-serif italic text-stone-500">modelContext WebMCP runtime active</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Mute toggle */}
          <button
            onClick={() => {
              if (!isMuted && isSpeaking) window.speechSynthesis.cancel();
              setIsMuted(!isMuted);
            }}
            className="p-1.5 border border-stone-200 hover:border-black text-stone-600 hover:text-black hover:bg-white transition"
            title={isMuted ? 'Unmute voice reading' : 'Mute voice reading'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-stone-400" /> : <Volume2 className="w-3.5 h-3.5 text-black" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 border border-stone-200 hover:border-black text-stone-600 hover:text-black hover:bg-white transition text-xs font-mono"
            title="Close Agent Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mode Switcher: Text Interaction vs Voice Intent Mode */}
      <div className="px-3 py-1.5 bg-[#FCFAF7] border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center bg-stone-200/80 p-0.5 border border-stone-300 font-mono text-[10px]">
          <button
            onClick={() => setInteractionMode('chat')}
            className={`px-2.5 py-1 uppercase font-bold flex items-center space-x-1 transition ${
              interactionMode === 'chat'
                ? 'bg-black text-white shadow-2xs'
                : 'text-stone-600 hover:text-black'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat Mode</span>
          </button>
          <button
            onClick={() => setInteractionMode('voice_intent')}
            className={`px-2.5 py-1 uppercase font-bold flex items-center space-x-1 transition ${
              interactionMode === 'voice_intent'
                ? 'bg-amber-500 text-black shadow-2xs'
                : 'text-stone-600 hover:text-black'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>Voice Intent</span>
          </button>
        </div>

        <div className="text-[10px] text-stone-500 font-mono">
          {interactionMode === 'voice_intent' ? (
            <span className="text-amber-700 font-bold uppercase flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Voice Active</span>
            </span>
          ) : (
            <span>Dual-User Protocol</span>
          )}
        </div>
      </div>

      {/* Active Proposal Alert Banner */}
      {activeProposal && activeProposal.status === 'pending' && (
        <div className="p-3 bg-amber-50 border-b border-amber-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Diff Pending Review</span>
            </div>
            <p className="text-xs font-serif italic text-amber-800 truncate max-w-[230px]">
              {activeProposal.title} ({activeProposal.changes.length} diffs)
            </p>
          </div>
          <button
            onClick={onOpenProposalModal}
            className="px-3 py-1 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-2xs"
          >
            Review Diff
          </button>
        </div>
      )}

      {/* VOICE INTENT MODE VIEW */}
      {interactionMode === 'voice_intent' ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
          {/* Main Voice Visualizer Card */}
          <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            {/* Status pill */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isListening
                      ? 'bg-rose-500 animate-ping'
                      : isAgentThinking
                      ? 'bg-amber-500 animate-spin'
                      : isSpeaking
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-stone-400'
                  }`}
                />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-black">
                  {isListening
                    ? 'Listening To Speech...'
                    : isAgentThinking
                    ? 'Executing WebMCP Tools...'
                    : isSpeaking
                    ? 'Speaking Response...'
                    : 'Voice Intent Ready'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                {voiceAvailable ? 'Web Speech API' : 'Simulation Mode'}
              </span>
            </div>

            {/* Pulsing Audio Waveform Visualizer */}
            <div className="flex items-center justify-center space-x-2 h-16 my-2 bg-[#FCFAF7] border border-stone-200 p-2">
              {[0.4, 0.9, 0.6, 1.0, 0.7, 0.85, 0.5].map((scale, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isListening || isSpeaking ? [`${16 * scale}px`, `${48 * scale}px`, `${20 * scale}px`] : '8px',
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + i * 0.1,
                    ease: 'easeInOut',
                  }}
                  className={`w-2.5 transition-colors ${
                    isListening
                      ? 'bg-rose-500'
                      : isSpeaking
                      ? 'bg-emerald-600'
                      : isAgentThinking
                      ? 'bg-amber-500'
                      : 'bg-stone-300'
                  }`}
                />
              ))}
            </div>

            {/* Big Tactile Microphone Button */}
            <div className="flex flex-col items-center justify-center my-4">
              <button
                onClick={toggleListening}
                disabled={isAgentThinking}
                className={`w-20 h-20 rounded-full flex items-center justify-center border-2 border-black transition-all transform active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  isListening
                    ? 'bg-rose-600 text-white ring-4 ring-rose-300 animate-pulse'
                    : 'bg-white hover:bg-amber-400 text-black'
                }`}
                title={isListening ? 'Click to stop listening' : 'Click to dictate voice intent'}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <p className="mt-2 text-xs font-mono text-stone-600 font-medium">
                {isListening ? 'Listening... Click to Finish' : 'Tap Microphone to Speak Intent'}
              </p>
            </div>

            {/* Real-time Intent Classification Badge */}
            <div className="mt-3 p-2.5 bg-[#FCFAF7] border border-stone-300 space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                <span>Classified Intent:</span>
                <span className="text-amber-700">
                  {classifiedIntent.confidence > 0 ? `${Math.round(classifiedIntent.confidence * 100)}% Match` : 'Awaiting'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-black font-bold text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>{classifiedIntent.label}</span>
              </div>
              <p className="text-[10px] text-stone-600 font-sans">{classifiedIntent.description}</p>
            </div>

            {/* Dictated / Live Transcript Field */}
            <div className="mt-3 space-y-1">
              <label className="text-[10px] font-mono uppercase text-stone-500 font-bold flex items-center justify-between">
                <span>Spoken Transcript:</span>
                {voiceTranscript && (
                  <button
                    onClick={() => setVoiceTranscript('')}
                    className="text-stone-400 hover:text-black uppercase text-[9px]"
                  >
                    Clear
                  </button>
                )}
              </label>
              <textarea
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Spoken words will appear here in real-time as you dictate..."
                rows={3}
                className="w-full p-2.5 text-xs bg-white border border-stone-300 font-mono text-black focus:outline-hidden focus:border-black resize-none"
              />
            </div>

            {/* Voice Intent Action Bar */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <label className="flex items-center space-x-1.5 text-[10px] font-mono text-stone-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoExecuteOnPause}
                  onChange={(e) => setAutoExecuteOnPause(e.target.checked)}
                  className="rounded-none text-black focus:ring-0"
                />
                <span>Auto-execute on pause</span>
              </label>

              <button
                onClick={() => handleSend(voiceTranscript, true)}
                disabled={!voiceTranscript.trim() || isAgentThinking}
                className="px-4 py-2 bg-black hover:bg-stone-800 disabled:opacity-40 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] flex items-center space-x-1.5"
              >
                {isAgentThinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-400" />}
                <span>Execute Spoken Intent</span>
              </button>
            </div>
          </div>

          {/* Spoken Intent Quick Dictate Simulations (One-click triggers) */}
          <div className="bg-[#FCFAF7] border border-stone-300 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase font-bold text-stone-600 tracking-wider">
                Simulate Spoken Intent (One-Click)
              </h4>
              <span className="text-[9px] font-mono text-stone-400">Click to dictation-test</span>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => simulateVoiceDictation('Create an urgent task to audit security vulnerabilities for Tech founder')}
                className="w-full text-left p-2 bg-white hover:bg-stone-100 border border-stone-200 hover:border-black transition flex items-center justify-between text-xs font-mono group"
              >
                <span className="text-stone-800 group-hover:text-black">
                  🎙️ &quot;Create an urgent task to audit security vulnerabilities&quot;
                </span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-black shrink-0 ml-1" />
              </button>

              <button
                onClick={() => simulateVoiceDictation('Create a realistic two-week product launch plan for a two-person team')}
                className="w-full text-left p-2 bg-white hover:bg-stone-100 border border-stone-200 hover:border-black transition flex items-center justify-between text-xs font-mono group"
              >
                <span className="text-stone-800 group-hover:text-black">
                  🎙️ &quot;Create a realistic two-week product launch plan&quot;
                </span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-black shrink-0 ml-1" />
              </button>

              <button
                onClick={() => simulateVoiceDictation('This is too ambitious. Make it achievable for two people in fourteen days')}
                className="w-full text-left p-2 bg-white hover:bg-stone-100 border border-stone-200 hover:border-black transition flex items-center justify-between text-xs font-mono group"
              >
                <span className="text-stone-800 group-hover:text-black">
                  🎙️ &quot;This is too ambitious. Make it achievable in fourteen days&quot;
                </span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-black shrink-0 ml-1" />
              </button>

              <button
                onClick={() => simulateVoiceDictation('Undo the last change')}
                className="w-full text-left p-2 bg-white hover:bg-stone-100 border border-stone-200 hover:border-black transition flex items-center justify-between text-xs font-mono group"
              >
                <span className="text-stone-800 group-hover:text-black">
                  🎙️ &quot;Undo the last change&quot;
                </span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-black shrink-0 ml-1" />
              </button>
            </div>
          </div>

          {/* Last Spoken Agent Output Card */}
          {lastSpokenText && (
            <div className="p-3 bg-white border border-stone-300 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-stone-500">
                <span className="flex items-center space-x-1">
                  <Volume2 className="w-3 h-3 text-emerald-600" />
                  <span>Agent Voice Confirmation</span>
                </span>
                <button
                  onClick={() => speakResponse(lastSpokenText)}
                  className="text-stone-600 hover:text-black font-bold uppercase text-[9px]"
                >
                  Replay Audio
                </button>
              </div>
              <p className="text-xs text-stone-800 font-serif italic">{lastSpokenText}</p>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD CHAT & TOOL EXECUTION VIEW */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-1 text-[10px] text-stone-400 mb-1 px-1 font-mono uppercase tracking-wider">
                <span>{msg.sender === 'user' ? 'user' : 'forge agent'}</span>
                {msg.voiceDictated && (
                  <span className="px-1 py-0.2 bg-amber-100 border border-amber-300 text-amber-800 font-bold text-[8px]">
                    🎙️ Voice Dictated
                  </span>
                )}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`p-3.5 max-w-[92%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-black text-white font-mono text-[11px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                    : 'bg-white border border-stone-200 text-[#1A1A1A] shadow-xs'
                }`}
              >
                {msg.text}

                {/* Tools invoked tags */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200 space-y-1.5">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                      Tools Invoked:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {msg.toolsUsed.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 font-mono text-[10px] bg-stone-100 text-black border border-stone-300"
                        >
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposal banner inside chat */}
                {msg.hasProposal && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200">
                    <button
                      onClick={onOpenProposalModal}
                      className="w-full py-1.5 px-2.5 bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-[10px] uppercase tracking-wider transition flex items-center justify-center space-x-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Review &amp; Apply Diff</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Agent Thinking Skeleton */}
          {isAgentThinking && (
            <div className="flex flex-col items-start space-y-1">
              <div className="text-[10px] text-stone-400 px-1 font-mono uppercase tracking-wider">
                forge agent • thinking
              </div>
              <div className="p-3 bg-white border border-stone-200 flex items-center space-x-2 text-stone-600 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span className="font-serif italic text-xs">Inspecting workspace &amp; invoking WebMCP tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* Activity Log Feed */}
          {actions.length > 0 && (
            (() => {
              const proposalActions = actions.filter(isProposalAction);
              const displayedActions = activityFilter === 'proposals' ? proposalActions : actions;

              return (
                <div className="pt-4 border-t border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                    <span>Agent Activity ({actions.length})</span>
                    <span className="text-[9px] text-stone-400">Live RPC Log</span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center space-x-1 bg-stone-100 p-0.5 border border-stone-200 font-mono text-[10px]">
                    <button
                      onClick={() => setActivityFilter('all')}
                      className={`flex-1 py-1 text-center font-bold uppercase transition ${
                        activityFilter === 'all'
                          ? 'bg-white text-black border border-stone-300 shadow-2xs'
                          : 'text-stone-500 hover:text-black'
                      }`}
                    >
                      All Actions ({actions.length})
                    </button>
                    <button
                      onClick={() => setActivityFilter('proposals')}
                      className={`flex-1 py-1 text-center font-bold uppercase transition ${
                        activityFilter === 'proposals'
                          ? 'bg-white text-black border border-stone-300 shadow-2xs'
                          : 'text-stone-500 hover:text-black'
                      }`}
                    >
                      Proposals ({proposalActions.length})
                    </button>
                  </div>

                  {/* Undo Feedback Alert Banner */}
                  <AnimatePresence>
                    {showUndoNotice && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 font-mono text-[10px] flex items-center justify-between shadow-xs"
                      >
                        <div className="flex items-center space-x-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                          <span className="font-bold">Workspace state reverted successfully.</span>
                        </div>
                        <span className="text-amber-700 text-[9px]">Snapshot restored</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action list items */}
                  <AnimatePresence initial={false}>
                    {displayedActions.slice(0, 6).map((act) => {
                      const isExpanded = expandedActionId === act.id;
                      const wasJustUndone = act.id === lastUndoneId;

                      return (
                        <motion.div
                          key={act.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{
                            opacity: wasJustUndone ? 0.6 : 1,
                            y: 0,
                            backgroundColor: wasJustUndone ? '#FEF3C7' : '#FFFFFF',
                          }}
                          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                          transition={{ duration: 0.2 }}
                          className={`p-2.5 border text-[11px] font-mono shadow-2xs transition-colors ${
                            act.toolName === 'undo_changes'
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-stone-200 bg-white'
                          }`}
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setExpandedActionId(isExpanded ? null : act.id)}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  act.error ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-bold text-black">{act.toolName}</span>
                              <span className="text-stone-400 text-[9px]">
                                • {formatRelativeTime(act.timestamp)}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              {act.status && (
                                <span className="text-[9px] px-1 bg-stone-100 border border-stone-200 text-stone-600">
                                  {act.status}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-stone-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-stone-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-stone-100 space-y-1.5 text-[10px]">
                              {act.affectedObjects && act.affectedObjects.length > 0 && (
                                <div>
                                  <span className="text-stone-400 font-bold">Targets:</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {act.affectedObjects.map((obj, i) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.2 bg-stone-100 border border-stone-200 text-stone-700 text-[9px]"
                                      >
                                        {obj.type}:{obj.id}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {act.rationale && (
                                <div className="text-black font-sans font-medium">{act.rationale}</div>
                              )}
                              <div className="bg-white p-1.5 border border-stone-200 overflow-x-auto">
                                <span className="text-stone-400 font-bold">Input:</span> {JSON.stringify(act.input)}
                              </div>
                              {act.output && (
                                <div className="bg-white p-1.5 border border-stone-200 overflow-x-auto text-emerald-800">
                                  <span className="text-stone-400 font-bold">Output:</span> {JSON.stringify(act.output)}
                                </div>
                              )}
                              {act.error && (
                                <div className="bg-rose-50 p-1.5 border border-rose-200 text-rose-700">
                                  Error: {act.error}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Suggested Quick Prompts (visible in Chat Mode) */}
      {interactionMode === 'chat' && (
        <div className="p-2 border-t border-stone-200 bg-[#FCFAF7] flex space-x-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleSend('Create a realistic two-week product launch plan for a two-person team')}
            className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-stone-800 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap border border-stone-300 hover:border-black transition"
          >
            🚀 2-Wk Launch Plan
          </button>
          <button
            onClick={() => handleSend('This is too ambitious. Make it achievable for two people in fourteen days')}
            className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-stone-800 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap border border-stone-300 hover:border-black transition"
          >
            ✂️ Scope Down (2p/14d)
          </button>
          <button
            onClick={() => handleSend('Undo the last change')}
            className="px-2.5 py-1 bg-white hover:bg-black hover:text-white text-stone-800 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap border border-stone-300 hover:border-black transition"
          >
            ↩️ Undo Last Change
          </button>
        </div>
      )}

      {/* Input Area (Chat Mode) */}
      {interactionMode === 'chat' && (
        <div className="p-3.5 border-t border-stone-200 bg-[#FDFCFB]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            {/* Quick Mic toggle inside Chat Mode */}
            {voiceAvailable && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 border transition ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-white text-stone-800 border-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]'
                }`}
                title={isListening ? 'Stop listening' : 'Voice dictation'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={isListening ? 'Listening to voice...' : 'Direct agent to inspect, plan, or modify...'}
              disabled={isAgentThinking}
              className="flex-1 bg-white border border-stone-300 rounded-none px-3.5 py-2 text-xs text-[#1A1A1A] placeholder-stone-400 focus:outline-hidden focus:border-black transition font-sans"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isAgentThinking}
              className="p-2.5 bg-black hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400 font-mono">
            <span>Agent executes via <code>document.modelContext</code></span>
            <button
              onClick={() => setInteractionMode('voice_intent')}
              className="text-amber-700 hover:text-black font-bold uppercase"
            >
              Open Voice Mode →
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

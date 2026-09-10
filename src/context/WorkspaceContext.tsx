import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Project,
  Task,
  Milestone,
  Document,
  CanvasCard,
  AgentAction,
  ChangeProposal,
  WorkspaceSnapshot,
  WebMCPToolDefinition,
} from '../types/forge';
import {
  INITIAL_PROJECT,
  INITIAL_TASKS,
  INITIAL_MILESTONES,
  INITIAL_DOCUMENTS,
  INITIAL_CARDS,
} from '../data/seed';
import { initializeWebMCP, subscribeWebMCP } from '../webmcp/context';
import { WorkspaceService, WorkspaceStateAccessor } from '../services/workspaceService';
import { buildAllWebMCPTools } from '../webmcp/registry';
import { notifyChangesSaved } from './ToastContext';

interface WorkspaceContextType {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  cards: CanvasCard[];
  setCards: React.Dispatch<React.SetStateAction<CanvasCard[]>>;
  actions: AgentAction[];
  proposals: ChangeProposal[];
  activeProposal: ChangeProposal | null;
  setActiveProposal: (proposal: ChangeProposal | null) => void;
  snapshots: WorkspaceSnapshot[];
  registeredTools: WebMCPToolDefinition[];
  isAgentThinking: boolean;
  setIsAgentThinking: (thinking: boolean) => void;

  // Domain Actions
  applyProposal: (proposalId: string) => Promise<boolean>;
  rejectProposal: (proposalId: string) => void;
  undoLastChange: () => boolean;
  takeSnapshot: (label: string) => WorkspaceSnapshot;
  resetToInitialSeed: () => void;
  executeToolByName: (name: string, input: any) => Promise<any>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [cards, setCards] = useState<CanvasCard[]>(INITIAL_CARDS);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [activeProposal, setActiveProposal] = useState<ChangeProposal | null>(null);
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([]);
  const [registeredTools, setRegisteredTools] = useState<WebMCPToolDefinition[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(false);

  // Keep a synchronized ref to latest state for tool callbacks executing across async ticks
  const stateRef = useRef({
    project,
    tasks,
    milestones,
    documents,
    cards,
    proposals,
    activeProposal,
    snapshots,
  });

  useEffect(() => {
    stateRef.current = {
      project,
      tasks,
      milestones,
      documents,
      cards,
      proposals,
      activeProposal,
      snapshots,
    };
  }, [project, tasks, milestones, documents, cards, proposals, activeProposal, snapshots]);

  // Automated persistence reassurance: automatically trigger 'Changes saved' toast on user/tool modifications
  const prevTasksRef = useRef<Task[]>(INITIAL_TASKS);
  const prevDocsRef = useRef<Document[]>(INITIAL_DOCUMENTS);
  const isInitialMountRef = useRef<boolean>(true);
  const isResettingSeedRef = useRef<boolean>(false);
  const lastAutoSaveToastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevTasksRef.current = tasks;
      prevDocsRef.current = documents;
      return;
    }

    if (isResettingSeedRef.current) {
      prevTasksRef.current = tasks;
      prevDocsRef.current = documents;
      return;
    }

    const now = Date.now();

    // Check if tasks were modified
    if (tasks !== prevTasksRef.current) {
      prevTasksRef.current = tasks;
      if (now - lastAutoSaveToastTimeRef.current > 400) {
        lastAutoSaveToastTimeRef.current = now;
        notifyChangesSaved({
          entity: 'task',
          message: 'Task modifications saved and persisted to workspace.',
        });
      }
    }

    // Check if documents were modified
    if (documents !== prevDocsRef.current) {
      prevDocsRef.current = documents;
      if (now - lastAutoSaveToastTimeRef.current > 400) {
        lastAutoSaveToastTimeRef.current = now;
        notifyChangesSaved({
          entity: 'document',
          message: 'Document modifications saved and persisted to workspace.',
        });
      }
    }
  }, [tasks, documents]);

  // Instantiate application service layer connecting directly to state
  const workspaceService = useMemo(() => {
    const accessor: WorkspaceStateAccessor = {
      getProject: () => stateRef.current.project,
      setProject: (p) => setProject(p),
      getTasks: () => stateRef.current.tasks,
      setTasks: (t) => setTasks(t),
      getMilestones: () => stateRef.current.milestones,
      setMilestones: (m) => setMilestones(m),
      getDocuments: () => stateRef.current.documents,
      setDocuments: (d) => setDocuments(d),
      getCards: () => stateRef.current.cards,
      setCards: (c) => setCards(c),
      getProposals: () => stateRef.current.proposals,
      setProposals: (pr) => setProposals(pr),
      getActiveProposal: () => stateRef.current.activeProposal,
      setActiveProposal: (ap) => setActiveProposal(ap),
      getSnapshots: () => stateRef.current.snapshots,
      setSnapshots: (s) => setSnapshots(s),
    };
    return new WorkspaceService(accessor);
  }, []);

  // Wire up WebMCP Registration and real-time Observability
  useEffect(() => {
    const modelContext = initializeWebMCP();

    // Telemetry handler updating the Agent Action Stream in the UI
    const handleActionLogged = (action: AgentAction) => {
      setActions((prev) => {
        const existingIdx = prev.findIndex((a) => a.id === action.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = action;
          return updated;
        }
        return [action, ...prev.slice(0, 49)]; // keep latest 50 actions
      });
    };

    // Build all WebMCP tools backed by the WorkspaceService
    const tools = buildAllWebMCPTools(workspaceService, handleActionLogged);

    // Register all tools to document.modelContext
    tools.forEach((tool) => {
      modelContext.registerTool(tool);
    });

    setRegisteredTools(modelContext.getRegisteredTools());

    // Listen to low-level context events if any external caller invokes tools directly
    const unsubscribe = subscribeWebMCP((event) => {
      if (event.type === 'call_start') {
        setIsAgentThinking(true);
      } else if (event.type === 'call_end') {
        setIsAgentThinking(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [workspaceService]);

  // Primary UI Domain Handlers calling into WorkspaceService
  const applyProposal = useCallback(
    async (proposalId: string): Promise<boolean> => {
      // Human confirmed through UI
      const res = workspaceService.applyApprovedChanges({
        proposalId,
        humanConfirmed: true,
      });
      return !!res.success;
    },
    [workspaceService]
  );

  const rejectProposal = useCallback(
    (proposalId: string) => {
      workspaceService.rejectChanges({ proposalId });
    },
    [workspaceService]
  );

  const undoLastChange = useCallback((): boolean => {
    const res = workspaceService.undoChanges();
    return !!res.success;
  }, [workspaceService]);

  const takeSnapshot = useCallback(
    (label: string): WorkspaceSnapshot => {
      return workspaceService.takeSnapshot(label);
    },
    [workspaceService]
  );

  const resetToInitialSeed = useCallback(() => {
    isResettingSeedRef.current = true;
    workspaceService.takeSnapshot('Before reset to initial template');
    setProject(JSON.parse(JSON.stringify(INITIAL_PROJECT)));
    setTasks(JSON.parse(JSON.stringify(INITIAL_TASKS)));
    setMilestones(JSON.parse(JSON.stringify(INITIAL_MILESTONES)));
    setDocuments(JSON.parse(JSON.stringify(INITIAL_DOCUMENTS)));
    setCards(JSON.parse(JSON.stringify(INITIAL_CARDS)));
    setProposals([]);
    setActiveProposal(null);
    setTimeout(() => {
      isResettingSeedRef.current = false;
    }, 150);
  }, [workspaceService]);

  const executeToolByName = useCallback(async (name: string, input: any) => {
    if (typeof document !== 'undefined' && document.modelContext) {
      return await document.modelContext.execute(name, input);
    }
    throw new Error('WebMCP document.modelContext not available in this environment');
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        project,
        setProject,
        tasks,
        setTasks,
        milestones,
        setMilestones,
        documents,
        setDocuments,
        cards,
        setCards,
        actions,
        proposals,
        activeProposal,
        setActiveProposal,
        snapshots,
        registeredTools,
        isAgentThinking,
        setIsAgentThinking,
        applyProposal,
        rejectProposal,
        undoLastChange,
        takeSnapshot,
        resetToInitialSeed,
        executeToolByName,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

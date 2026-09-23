import React, { useState, useMemo, useRef } from 'react';
import {
  Camera,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Edit3,
  Check,
  X,
  Eye,
  FileJson,
  Calendar,
  Layers,
  Flag,
  FileText,
  Clock,
  Sparkles,
  Search,
  HardDrive,
  Copy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  FolderDown,
  Tag,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { WorkspaceSnapshotRecord, WorkspaceViewId } from '../types/snapshot';
import { formatRelativeTime, formatFullDateTime } from '../utils/taskFilters';
import { notifyToast } from '../context/ToastContext';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: WorkspaceViewId;
  onNavigateView?: (view: WorkspaceViewId) => void;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigateView,
}) => {
  const {
    project,
    tasks,
    milestones,
    documents,
    cards,
    savedSnapshots,
    saveWorkspaceSnapshot,
    restoreWorkspaceSnapshot,
    deleteWorkspaceSnapshot,
    updateWorkspaceSnapshotMetadata,
    exportWorkspaceSnapshot,
    exportAllWorkspaceSnapshots,
    importWorkspaceSnapshot,
  } = useWorkspace();

  const { theme, fontSizeMode } = useTheme();

  // New Snapshot Form State
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [newSnapshotTag, setNewSnapshotTag] = useState('');
  const [showDetailedCreate, setShowDetailedCreate] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'auto'>('all');

  // Card UI State
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Restore Confirmation State
  const [confirmingRestoreId, setConfirmingRestoreId] = useState<string | null>(null);
  const [createBackupBeforeRestore, setCreateBackupBeforeRestore] = useState(true);
  const [switchViewOnRestore, setSwitchViewOnRestore] = useState(true);

  // Delete Confirmation State
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Import JSON State
  const [showImportSection, setShowImportSection] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Workspace Summary
  const liveStats = useMemo(() => {
    const totalEstimateDays = tasks.reduce((sum, t) => sum + (t.estimateDays || 0), 0);
    const todoCount = tasks.filter((t) => t.status === 'todo' && !t.archived).length;
    const inProgCount = tasks.filter((t) => t.status === 'in_progress' && !t.archived).length;
    const reviewCount = tasks.filter((t) => t.status === 'review' && !t.archived).length;
    const doneCount = tasks.filter((t) => t.status === 'done' && !t.archived).length;

    return {
      totalTasks: tasks.length,
      todoCount,
      inProgCount,
      reviewCount,
      doneCount,
      milestonesCount: milestones.length,
      docsCount: documents.length,
      cardsCount: cards.length,
      totalEstimateDays,
    };
  }, [tasks, milestones, documents, cards]);

  // Filtered Snapshots
  const filteredSnapshots = useMemo(() => {
    return savedSnapshots.filter((snap) => {
      // Type filter
      if (filterType === 'manual' && snap.isAutoBackup) return false;
      if (filterType === 'auto' && !snap.isAutoBackup) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = snap.name.toLowerCase().includes(q);
        const matchesDesc = (snap.description || '').toLowerCase().includes(q);
        const matchesTags = (snap.tags || []).some((tag) => tag.toLowerCase().includes(q));
        const matchesProject = snap.projectName.toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesTags || matchesProject;
      }

      return true;
    });
  }, [savedSnapshots, searchQuery, filterType]);

  // Total LocalStorage Size of Snapshots
  const totalStorageSizeFormatted = useMemo(() => {
    const totalBytes = savedSnapshots.reduce((acc, s) => acc + (s.stats?.byteSize || 0), 0);
    if (totalBytes === 0) return '0 KB';
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }, [savedSnapshots]);

  if (!isOpen) return null;

  // Handle Quick Create Snapshot
  const handleCreateSnapshot = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const defaultName = `Snapshot - ${new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} at ${new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const finalName = newSnapshotName.trim() || defaultName;
    const tags = newSnapshotTag
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    saveWorkspaceSnapshot(finalName, newSnapshotDesc, {
      activeView,
      viewConfig: {
        activeView,
        theme,
        fontSizeMode,
      },
      tags: tags.length ? tags : ['manual'],
    });

    setNewSnapshotName('');
    setNewSnapshotDesc('');
    setNewSnapshotTag('');
    setShowDetailedCreate(false);
  };

  // Handle Start Edit
  const handleStartEdit = (snap: WorkspaceSnapshotRecord) => {
    setEditingId(snap.id);
    setEditName(snap.name);
    setEditDesc(snap.description || '');
  };

  // Handle Save Edit
  const handleSaveEdit = (snapshotId: string) => {
    if (!editName.trim()) return;
    updateWorkspaceSnapshotMetadata(snapshotId, {
      name: editName.trim(),
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  // Handle Confirm Restore
  const handleExecuteRestore = (snap: WorkspaceSnapshotRecord) => {
    const res = restoreWorkspaceSnapshot(snap.id, {
      createBackupFirst: createBackupBeforeRestore,
      switchView: switchViewOnRestore,
    });

    if (res.success) {
      if (switchViewOnRestore && snap.viewConfig?.activeView && onNavigateView) {
        onNavigateView(snap.viewConfig.activeView);
      }
      setConfirmingRestoreId(null);
      onClose();
    }
  };

  // Handle File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importWorkspaceSnapshot(content);
        if (res.success) {
          setShowImportSection(false);
          setImportJsonText('');
          setImportError(null);
        } else {
          setImportError(res.error || 'Failed to import snapshot');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Textarea JSON Import
  const handleTextImport = () => {
    if (!importJsonText.trim()) return;
    const res = importWorkspaceSnapshot(importJsonText);
    if (res.success) {
      setShowImportSection(false);
      setImportJsonText('');
      setImportError(null);
    } else {
      setImportError(res.error || 'Failed to import snapshot');
    }
  };

  const copySnapshotJSON = (snap: WorkspaceSnapshotRecord) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(snap, null, 2));
      notifyToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `Snapshot JSON for "${snap.name}" copied.`,
      });
    } catch {
      notifyToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Unable to write to system clipboard.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#0E131F] w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshot-manager-title"
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/80 dark:bg-stone-900/60">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ring-1 ring-amber-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2
                  id="snapshot-manager-title"
                  className="text-base sm:text-lg font-bold tracking-tight text-stone-950 dark:text-white truncate"
                >
                  Workspace Snapshots
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {savedSnapshots.length} saved
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                  <HardDrive className="w-3 h-3" />
                  <span>{totalStorageSizeFormatted} in LocalStorage</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                Save current workspace state into LocalStorage and restore past project configurations with 1-click.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowImportSection((prev) => !prev)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
              title="Import snapshot from a JSON file or raw text"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import JSON</span>
            </button>

            <button
              onClick={exportAllWorkspaceSnapshots}
              disabled={savedSnapshots.length === 0}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Download all snapshots as a JSON archive"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export All</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Current Live State & Quick Save */}
          <div className="rounded-xl p-4 bg-gradient-to-r from-stone-50 to-stone-100/60 dark:from-stone-900/70 dark:to-stone-900/40 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  Current Live Workspace
                </span>
                <span className="text-xs font-mono font-medium text-stone-400 dark:text-stone-500">
                  ({project.name})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  View: {activeView.toUpperCase()}
                </span>
              </div>

              {/* Live metrics pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-stone-600 dark:text-stone-300">
                <span className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  📋 {liveStats.totalTasks} Tasks ({liveStats.doneCount} done)
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  🚩 {liveStats.milestonesCount} Milestones
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  📝 {liveStats.docsCount} Docs
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  ⏱️ {liveStats.totalEstimateDays}d Effort
                </span>
              </div>
            </div>

            {/* Quick Save Input Form */}
            <form onSubmit={handleCreateSnapshot} className="space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Camera className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    placeholder="Snapshot name (e.g. Sprint 1 MVP Baseline, Architecture Refactor)..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition shadow-2xs"
                  />
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDetailedCreate(!showDetailedCreate)}
                    className="px-2.5 py-2 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 transition cursor-pointer"
                    title="Add description & tags"
                  >
                    {showDetailedCreate ? 'Less' : 'More Options'}
                  </button>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold tracking-tight shadow-xs transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Save Snapshot</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Details: Description & Tags */}
              {showDetailedCreate && (
                <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Notes / Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newSnapshotDesc}
                      onChange={(e) => setNewSnapshotDesc(e.target.value)}
                      placeholder="e.g., Captured before removing dark mode tasks"
                      className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newSnapshotTag}
                      onChange={(e) => setNewSnapshotTag(e.target.value)}
                      placeholder="e.g. baseline, pre-audit, sprint-1"
                      className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Collapsible Import Drawer */}
          {showImportSection && (
            <div className="rounded-xl p-4 bg-stone-100 dark:bg-stone-900/80 border border-dashed border-stone-300 dark:border-stone-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileJson className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-900 dark:text-white">
                    Import Workspace Snapshot from JSON
                  </span>
                </div>
                <button
                  onClick={() => setShowImportSection(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Method 1: File Upload */}
                <div className="p-4 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-center flex flex-col items-center justify-center space-y-2">
                  <FolderDown className="w-8 h-8 text-stone-400" />
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Upload a .json snapshot file
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="snapshot-file-upload"
                  />
                  <label
                    htmlFor="snapshot-file-upload"
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 cursor-pointer transition shadow-2xs"
                  >
                    Select JSON File
                  </label>
                </div>

                {/* Method 2: Paste JSON text */}
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder="Or paste snapshot JSON payload here..."
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 font-mono text-[11px] text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleTextImport}
                    disabled={!importJsonText.trim()}
                    className="w-full py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Validate & Import JSON
                  </button>
                </div>
              </div>

              {importError && (
                <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search snapshots by name, tag, or note..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-lg border border-stone-200 dark:border-stone-800 shrink-0 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                All ({savedSnapshots.length})
              </button>
              <button
                onClick={() => setFilterType('manual')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  filterType === 'manual'
                    ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Manual ({savedSnapshots.filter((s) => !s.isAutoBackup).length})
              </button>
              <button
                onClick={() => setFilterType('auto')}
                className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                  filterType === 'auto'
                    ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Auto-Backups ({savedSnapshots.filter((s) => s.isAutoBackup).length})
              </button>
            </div>
          </div>

          {/* Section 3: Saved Snapshots Cards List */}
          <div className="space-y-3">
            {filteredSnapshots.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-stone-200 dark:border-stone-800 space-y-2">
                <Camera className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto" />
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
                  {searchQuery ? 'No snapshots match your search filter' : 'No snapshots stored in LocalStorage'}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 max-w-sm mx-auto">
                  Click "Save Snapshot" above to capture and preserve your current project configuration.
                </p>
              </div>
            ) : (
              filteredSnapshots.map((snap) => {
                const isExpanded = expandedPreviewId === snap.id;
                const isEditing = editingId === snap.id;
                const isConfirmingRestore = confirmingRestoreId === snap.id;
                const isConfirmingDelete = confirmingDeleteId === snap.id;

                const completionPct = snap.stats?.completionPercentage ?? 0;
                const formattedTime = formatRelativeTime(snap.createdAt);
                const fullDateTime = formatFullDateTime(snap.createdAt);

                return (
                  <div
                    key={snap.id}
                    className={`rounded-xl border transition duration-150 ${
                      isConfirmingRestore
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : isConfirmingDelete
                        ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
                        : snap.isAutoBackup
                        ? 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800/80 hover:border-stone-300 dark:hover:border-stone-700'
                        : 'bg-white dark:bg-stone-900/90 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs'
                    }`}
                  >
                    {/* Main Card Header & Row */}
                    <div className="p-3.5 sm:p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Title & Metadata */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 rounded bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-sm font-bold text-stone-950 dark:text-white"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="Add optional description..."
                                className="w-full px-2 py-1 rounded bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300"
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(snap.id)}
                                  className="px-2.5 py-1 rounded bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-semibold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1 rounded bg-stone-200 dark:bg-stone-800 text-xs font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-sm sm:text-base text-stone-950 dark:text-white tracking-tight">
                                  {snap.name}
                                </h3>

                                {snap.isAutoBackup ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                    Auto-Backup
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    Manual
                                  </span>
                                )}

                                <span
                                  className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center space-x-1"
                                  title={`Created: ${fullDateTime}`}
                                >
                                  <Clock className="w-3 h-3 inline text-stone-400" />
                                  <span>{formattedTime}</span>
                                </span>

                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800/80 text-stone-500 border border-stone-200 dark:border-stone-700">
                                  {snap.stats?.formattedSize || '12 KB'}
                                </span>
                              </div>

                              {snap.description && (
                                <p className="text-xs text-stone-600 dark:text-stone-300">
                                  {snap.description}
                                </p>
                              )}

                              {/* Tags */}
                              {snap.tags && snap.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  {snap.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                  {snap.viewConfig?.activeView && (
                                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                                      • Saved from {snap.viewConfig.activeView.toUpperCase()} view
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Top Action Buttons */}
                        {!isConfirmingRestore && !isConfirmingDelete && !isEditing && (
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {/* Restore Button (Prominent) */}
                            <button
                              onClick={() => setConfirmingRestoreId(snap.id)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                              title="Restore entire workspace state to this snapshot"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>

                            {/* Inspect Preview Toggle */}
                            <button
                              onClick={() => setExpandedPreviewId(isExpanded ? null : snap.id)}
                              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                              title={isExpanded ? 'Hide snapshot preview' : 'Inspect snapshot contents'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Download JSON */}
                            <button
                              onClick={() => exportWorkspaceSnapshot(snap.id)}
                              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                              title="Export this snapshot as a JSON file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Copy JSON */}
                            <button
                              onClick={() => copySnapshotJSON(snap)}
                              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                              title="Copy JSON to clipboard"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleStartEdit(snap)}
                              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                              title="Rename or edit description"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setConfirmingDeleteId(snap.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                              title="Delete snapshot from LocalStorage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Metrics Badges Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100 dark:border-stone-800/80 text-xs font-mono">
                        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-stone-100/80 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200">
                          <span className="font-bold">{snap.stats?.totalTasks ?? 0}</span>
                          <span className="text-stone-500">Tasks</span>
                          <span className="text-[10px] text-stone-400">
                            ({snap.stats?.tasksByStatus?.done ?? 0} done)
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-stone-100/80 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200">
                          <Flag className="w-3 h-3 text-amber-500" />
                          <span className="font-bold">{snap.stats?.milestoneCount ?? 0}</span>
                          <span className="text-stone-500">Milestones</span>
                        </div>

                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-stone-100/80 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200">
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span className="font-bold">{snap.stats?.documentCount ?? 0}</span>
                          <span className="text-stone-500">Docs</span>
                        </div>

                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-stone-100/80 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200">
                          <Layers className="w-3 h-3 text-purple-500" />
                          <span className="font-bold">{snap.stats?.cardCount ?? 0}</span>
                          <span className="text-stone-500">Canvas</span>
                        </div>

                        <div className="ml-auto flex items-center space-x-2 text-[11px] text-stone-500">
                          <span>{snap.stats?.totalEstimateDays ?? 0}d Estimated Workload</span>
                          <span>•</span>
                          <span>{completionPct}% Complete</span>
                        </div>
                      </div>

                      {/* Confirmation: Restore Workflow */}
                      {isConfirmingRestore && (
                        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3 animate-in fade-in">
                          <div className="flex items-start space-x-2">
                            <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-emerald-950 dark:text-emerald-100">
                              <p className="font-bold">
                                Restore workspace configuration to "{snap.name}"?
                              </p>
                              <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                                This will replace your current workspace state ({liveStats.totalTasks} tasks) with the {snap.stats?.totalTasks ?? 0} tasks and {snap.stats?.milestoneCount ?? 0} milestones from this snapshot.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 text-xs">
                            <div className="space-y-1">
                              <label className="flex items-center space-x-2 text-stone-700 dark:text-stone-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={createBackupBeforeRestore}
                                  onChange={(e) => setCreateBackupBeforeRestore(e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-medium">
                                  Create auto-backup of current live state before restore (Safe)
                                </span>
                              </label>

                              {snap.viewConfig?.activeView && (
                                <label className="flex items-center space-x-2 text-stone-700 dark:text-stone-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={switchViewOnRestore}
                                    onChange={(e) => setSwitchViewOnRestore(e.target.checked)}
                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span>
                                    Switch view to {snap.viewConfig.activeView.toUpperCase()} upon restore
                                  </span>
                                </label>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setConfirmingRestoreId(null)}
                                className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExecuteRestore(snap)}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                              >
                                Confirm Restore
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Confirmation: Delete Snapshot */}
                      {isConfirmingDelete && (
                        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2 animate-in fade-in">
                          <div className="flex items-center space-x-2 text-xs text-rose-900 dark:text-rose-200">
                            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="font-bold">
                              Are you sure you want to delete "{snap.name}" from LocalStorage?
                            </span>
                          </div>
                          <div className="flex items-center justify-end space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteWorkspaceSnapshot(snap.id);
                                setConfirmingDeleteId(null);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              Delete Permanently
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Collapsible Inspection / Preview Section */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                            <div className="flex items-center space-x-1.5">
                              <FileJson className="w-4 h-4 text-amber-500" />
                              <span>Snapshot Data Breakdown & Entities</span>
                            </div>
                            <button
                              onClick={() => copySnapshotJSON(snap)}
                              className="text-[11px] font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON payload</span>
                            </button>
                          </div>

                          {/* Quick entities grid preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Tasks Preview */}
                            <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-1.5 max-h-48 overflow-y-auto">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                Tasks in this snapshot ({snap.data.tasks.length}):
                              </span>
                              <div className="space-y-1">
                                {snap.data.tasks.slice(0, 10).map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between gap-1 text-[11px]"
                                  >
                                    <div className="flex items-center space-x-1.5 truncate">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          t.status === 'done'
                                            ? 'bg-emerald-500'
                                            : t.status === 'in_progress'
                                            ? 'bg-amber-500'
                                            : 'bg-stone-400'
                                        }`}
                                      />
                                      <span className="truncate">{t.title}</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-stone-400 shrink-0">
                                      {t.estimateDays}d
                                    </span>
                                  </div>
                                ))}
                                {snap.data.tasks.length > 10 && (
                                  <span className="text-[10px] text-stone-400 italic">
                                    + {snap.data.tasks.length - 10} more tasks...
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Milestones & Docs Preview */}
                            <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-2 max-h-48 overflow-y-auto">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                  Milestones ({snap.data.milestones.length}):
                                </span>
                                <div className="space-y-1 mt-1">
                                  {snap.data.milestones.map((m) => (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between text-[11px]"
                                    >
                                      <span className="truncate">🚩 {m.title}</span>
                                      <span className="text-[10px] font-mono text-stone-400">
                                        {m.targetDate}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-1.5 border-t border-stone-200 dark:border-stone-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                  Documents ({snap.data.documents.length}):
                                </span>
                                <div className="space-y-1 mt-1">
                                  {snap.data.documents.map((d) => (
                                    <div key={d.id} className="text-[11px] truncate">
                                      📝 {d.title} (v{d.version})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/80 dark:bg-stone-900/60 text-xs">
          <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero cloud leak: Snapshots reside 100% in your browser LocalStorage</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

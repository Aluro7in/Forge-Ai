import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Command,
  FileText,
  Flag,
  CheckSquare,
  Sparkles,
  Download,
  Upload,
  ArrowRight,
  X,
  Layers,
  Terminal,
  Kanban,
  ListTodo,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { notifyToast } from '../context/ToastContext';
import { ActiveView } from './Navigation';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: ActiveView) => void;
  onOpenProposalModal: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateView,
  onOpenProposalModal,
}) => {
  const { workspaceService, project, tasks, milestones, documents } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'task' | 'milestone' | 'document' | 'command'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setIsImporting(false);
      setIsExporting(false);
      setImportError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Execute full-text search across workspace using workspaceService
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const res = workspaceService.searchWorkspace({
      query: query.trim(),
      filterType: filterType === 'command' ? 'all' : filterType,
      limit: 25,
    });
    return res.results || [];
  }, [query, filterType, workspaceService, tasks, milestones, documents]);

  // Quick Action Commands
  const quickCommands = useMemo(() => {
    const commands = [
      {
        id: 'cmd-proposal',
        type: 'command' as const,
        title: 'Review Staged Change Proposals',
        subtitle: 'Human-in-the-loop governance modal',
        shortcut: 'Ctrl+P',
        icon: ShieldCheck,
        action: () => {
          onClose();
          onOpenProposalModal();
        },
      },
      {
        id: 'cmd-export',
        type: 'command' as const,
        title: 'Export Workspace State to JSON',
        subtitle: 'Serialize project, tasks, milestones & docs with WebMCP export_workspace_state',
        shortcut: 'Export',
        icon: Download,
        action: () => {
          handleExportWorkspace();
        },
      },
      {
        id: 'cmd-import',
        type: 'command' as const,
        title: 'Import Workspace State (Restore)',
        subtitle: 'Restore project data from JSON with automatic undo snapshot safety',
        shortcut: 'Import',
        icon: Upload,
        action: () => {
          setIsImporting(true);
        },
      },
      {
        id: 'cmd-toggle-theme',
        type: 'command' as const,
        title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to High-Contrast Dark Theme',
        subtitle: 'Toggle between clean editorial light theme and high-contrast dark theme',
        shortcut: 'Theme',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => {
          toggleTheme();
          notifyToast({
            type: 'info',
            title: theme === 'dark' ? 'Light Theme Activated' : 'High-Contrast Dark Theme Activated',
            message: 'CSS custom properties and contrast filters adjusted.',
          });
          onClose();
        },
      },
      {
        id: 'cmd-view-board',
        type: 'command' as const,
        title: 'Go to Kanban Board',
        subtitle: 'Interactive task workflow lanes',
        shortcut: 'View',
        icon: Kanban,
        action: () => {
          onNavigateView('board');
          onClose();
        },
      },
      {
        id: 'cmd-view-tasks',
        type: 'command' as const,
        title: 'Go to Tasks List',
        subtitle: 'Filterable tabular list of work items',
        shortcut: 'View',
        icon: ListTodo,
        action: () => {
          onNavigateView('list');
          onClose();
        },
      },
      {
        id: 'cmd-view-milestones',
        type: 'command' as const,
        title: 'Go to Milestones',
        subtitle: 'Timeline gates and delivery objectives',
        shortcut: 'View',
        icon: Flag,
        action: () => {
          onNavigateView('milestones');
          onClose();
        },
      },
      {
        id: 'cmd-view-canvas',
        type: 'command' as const,
        title: 'Go to Visual Canvas',
        subtitle: '2D spatial architecture & decision cards',
        shortcut: 'View',
        icon: Layers,
        action: () => {
          onNavigateView('canvas');
          onClose();
        },
      },
      {
        id: 'cmd-view-docs',
        type: 'command' as const,
        title: 'Go to Documents & PRDs',
        subtitle: 'Markdown specifications and release guides',
        shortcut: 'View',
        icon: FileText,
        action: () => {
          onNavigateView('docs');
          onClose();
        },
      },
      {
        id: 'cmd-view-inspector',
        type: 'command' as const,
        title: 'Open WebMCP Inspector',
        subtitle: 'Inspect document.modelContext registered tools & session telemetry',
        shortcut: 'WebMCP',
        icon: Terminal,
        action: () => {
          onNavigateView('inspector');
          onClose();
        },
      },
    ];

    if (!query.trim()) return commands;

    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    );
  }, [query, onClose, onNavigateView, onOpenProposalModal, workspaceService]);

  // Combined active list of navigable items
  const combinedItems = useMemo(() => {
    if (filterType === 'command') {
      return quickCommands;
    }
    if (!query.trim()) {
      return quickCommands;
    }
    return [...searchResults, ...quickCommands];
  }, [filterType, query, searchResults, quickCommands]);

  // Reset selected index when combined items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedItems.length]);

  // Handle Export
  const handleExportWorkspace = () => {
    try {
      const result = workspaceService.exportWorkspaceState({ pretty: true });
      if (result.success && result.json) {
        // Create downloadable JSON blob
        const blob = new Blob([result.json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `forge-workspace-${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        notifyToast({
          type: 'success',
          title: 'Workspace Exported',
          message: `Serialized ${result.summary?.tasksCount} tasks, ${result.summary?.milestonesCount} milestones, and ${result.summary?.documentsCount} docs (${result.byteSize} bytes).`,
        });
      }
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Could not serialize workspace state.',
      });
    }
  };

  // Handle Import from text
  const handlePerformImport = (jsonStr: string) => {
    setImportError(null);
    try {
      const result = workspaceService.importWorkspaceState({ stateJson: jsonStr });
      if (!result.success) {
        setImportError(result.error || 'Failed to import workspace JSON');
        notifyToast({
          type: 'error',
          title: 'Import Failed',
          message: result.error || 'Schema validation error in JSON.',
        });
        return;
      }

      notifyToast({
        type: 'success',
        title: 'Workspace Restored',
        message: `Restored ${result.importedCounts?.tasks} tasks, ${result.importedCounts?.milestones} milestones, and ${result.importedCounts?.documents} docs with undo snapshot backup.`,
      });
      setIsImporting(false);
      setImportJsonText('');
      onClose();
    } catch (err: any) {
      setImportError(err?.message || 'Invalid JSON syntax');
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
        setImportJsonText(content);
        handlePerformImport(content);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read selected file.');
    };
    reader.readAsText(file);
  };

  // Activate selected item
  const handleSelectItem = (item: any) => {
    if (!item) return;

    if ('action' in item) {
      item.action();
      return;
    }

    if (item.type === 'task') {
      onNavigateView('board');
      onClose();
      notifyToast({
        type: 'info',
        title: `Viewing Task`,
        message: item.title,
      });
    } else if (item.type === 'milestone') {
      onNavigateView('milestones');
      onClose();
      notifyToast({
        type: 'info',
        title: `Viewing Milestone`,
        message: item.title,
      });
    } else if (item.type === 'document') {
      onNavigateView('docs');
      onClose();
      notifyToast({
        type: 'info',
        title: `Viewing Document`,
        message: item.title,
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isImporting) {
          setIsImporting(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
      } else if (e.key === 'Enter') {
        if (!isImporting && combinedItems.length > 0) {
          e.preventDefault();
          handleSelectItem(combinedItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, combinedItems, selectedIndex, isImporting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white border border-stone-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-3 bg-[#FCFAF7] border-b border-stone-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
              ⌘
            </div>
            <span className="font-bold text-xs uppercase tracking-wider text-black font-mono">
              Workspace Command & Search
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-stone-500">
            <span className="px-1.5 py-0.5 bg-stone-200 text-stone-800 border border-stone-300 font-bold">Ctrl+K</span>
            <span>/</span>
            <span className="px-1.5 py-0.5 bg-stone-200 text-stone-800 border border-stone-300 font-bold">Ctrl+P</span>
            <button
              onClick={onClose}
              className="ml-2 text-stone-400 hover:text-black font-bold p-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        {!isImporting && (
          <div className="p-3 border-b border-stone-200 flex items-center space-x-3 bg-white">
            <Search className="w-5 h-5 text-stone-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search tasks, milestones, docs, or actions..."
              className="w-full bg-transparent text-sm sm:text-base outline-hidden text-black placeholder:text-stone-400 font-sans"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs text-stone-400 hover:text-black font-mono px-1.5 py-0.5 bg-stone-100 border border-stone-200"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Filter Pills */}
        {!isImporting && (
          <div className="px-3 py-2 bg-stone-50 border-b border-stone-200 flex items-center space-x-1.5 overflow-x-auto text-[10px] font-mono">
            <span className="text-stone-400 font-bold uppercase mr-1">Filter:</span>
            {(['all', 'task', 'milestone', 'document', 'command'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-0.5 uppercase tracking-wider font-bold transition ${
                  filterType === type
                    ? 'bg-black text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-black'
                }`}
              >
                {type === 'all'
                  ? 'All'
                  : type === 'task'
                  ? 'Tasks'
                  : type === 'milestone'
                  ? 'Milestones'
                  : type === 'document'
                  ? 'Documents'
                  : 'Commands'}
              </button>
            ))}
          </div>
        )}

        {/* Modal Body: Results or Import View */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          {isImporting ? (
            /* Import State Subview */
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-black" />
                  <h3 className="font-bold text-xs uppercase tracking-wider font-mono">
                    Restore Workspace State (WebMCP)
                  </h3>
                </div>
                <button
                  onClick={() => setIsImporting(false)}
                  className="text-xs text-stone-500 hover:text-black font-mono"
                >
                  ← Back to Search
                </button>
              </div>

              <p className="text-xs text-stone-600">
                Upload a exported JSON file or paste your serialized workspace state below. A rollback snapshot
                will be captured automatically before state is applied.
              </p>

              {importError && (
                <div className="p-2.5 bg-rose-50 border border-rose-400 text-rose-900 text-xs font-mono flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Import Validation Error:</span>
                    <span>{importError}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-black font-mono text-xs font-bold flex items-center space-x-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose JSON File...</span>
                </button>
                <span className="text-stone-400 text-xs font-serif italic">or paste raw JSON below</span>
              </div>

              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='Paste {"version": "1.0", "project": {...}, "tasks": [...]} here...'
                rows={7}
                className="w-full p-2.5 border border-stone-300 font-mono text-xs text-stone-800 bg-[#FCFAF7] focus:border-black outline-hidden"
              />

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsImporting(false)}
                  className="px-3 py-1.5 border border-stone-300 text-stone-600 font-mono text-xs hover:border-black"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePerformImport(importJsonText)}
                  disabled={!importJsonText.trim()}
                  className={`px-4 py-1.5 font-mono text-xs font-bold flex items-center space-x-1.5 ${
                    importJsonText.trim()
                      ? 'bg-black text-white hover:bg-stone-800'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Restore Workspace State</span>
                </button>
              </div>
            </div>
          ) : combinedItems.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-black" />
              <p className="text-xs font-mono font-bold text-stone-600">No matches found for "{query}"</p>
              <p className="text-[11px] font-serif italic mt-1 text-stone-400">
                Try searching for keywords in tasks, milestones, PRD docs, or use filter buttons above.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {combinedItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isCommand = 'action' in item;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-2.5 flex items-start justify-between cursor-pointer border transition ${
                      isSelected
                        ? 'bg-stone-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'
                        : 'bg-white border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 overflow-hidden">
                      <div
                        className={`w-6 h-6 mt-0.5 flex items-center justify-center shrink-0 ${
                          isCommand
                            ? 'bg-black text-white'
                            : item.type === 'task'
                            ? 'bg-stone-100 text-stone-800 border border-stone-300'
                            : item.type === 'milestone'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-50 text-blue-900 border border-blue-200'
                        }`}
                      >
                        {isCommand ? (
                          React.createElement(item.icon, { className: 'w-3.5 h-3.5' })
                        ) : item.type === 'task' ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : item.type === 'milestone' ? (
                          <Flag className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="overflow-hidden">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-black truncate">{item.title}</span>
                          {!isCommand && (
                            <span
                              className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.2 shrink-0 ${
                                item.type === 'task'
                                  ? 'bg-stone-200 text-stone-800'
                                  : item.type === 'milestone'
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              {item.type}
                            </span>
                          )}
                        </div>

                        {item.subtitle && (
                          <p className="text-[10px] text-stone-500 font-mono mt-0.5 truncate">
                            {item.subtitle}
                          </p>
                        )}

                        {'snippet' in item && item.snippet && (
                          <p className="text-[11px] text-stone-600 font-serif italic mt-1 line-clamp-1">
                            "{item.snippet}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-3 flex items-center space-x-1.5 self-center">
                      {isCommand && item.shortcut && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-stone-200 border border-stone-300 text-stone-800 font-bold">
                          {item.shortcut}
                        </span>
                      )}
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition ${
                          isSelected ? 'text-black translate-x-0.5' : 'text-stone-300'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard Hints Footer */}
        <div className="p-2.5 bg-[#FCFAF7] border-t border-stone-300 text-[10px] font-mono text-stone-500 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1 py-0.5 bg-white border border-stone-300 text-black font-bold">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-white border border-stone-300 text-black font-bold">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white border border-stone-300 text-black font-bold">↵</kbd> to select
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white border border-stone-300 text-black font-bold">esc</kbd> to close
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-stone-600">
            <span>WebMCP Full-Text Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileText,
  Save,
  Plus,
  Clock,
  User,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Document } from '../../types/forge';

export const DocumentsView: React.FC = () => {
  const { documents, executeToolByName } = useWorkspace();
  const { showChangesSaved } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [content, setContent] = useState<string>(documents[0]?.content || '');
  const [isSaved, setIsSaved] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleSelectDoc = (doc: Document) => {
    setSelectedDocId(doc.id);
    setContent(doc.content);
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    await executeToolByName('update_document', {
      documentId: selectedDoc.id,
      content,
    });
    setIsSaved(true);
    showChangesSaved({
      entity: 'document',
      name: selectedDoc.title,
      message: `Document "${selectedDoc.title}" saved and persisted to workspace memory.`,
    });
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCreateDoc = async () => {
    const title = prompt('Enter new document title:') || 'Untitled Specification';
    const res = await executeToolByName('create_document', {
      title,
      content: `# ${title}\n\nDrafted with Forge WebMCP Agent.`,
    });
    if (res?.document) {
      setSelectedDocId(res.document.id);
      setContent(res.document.content);
      showChangesSaved({
        entity: 'document',
        name: res.document.title,
        message: `New document "${res.document.title}" created and persisted.`,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black tracking-tight mb-1">
            Documentation Vault
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            Specifications, architecture guides, and launch checklists • Accessible to humans and agents
          </p>
        </div>

        <button
          onClick={handleCreateDoc}
          className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Document</span>
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document Tabs */}
        <div className="lg:col-span-4 bg-stone-50/70 border border-stone-200 p-4 space-y-3">
          <div className="text-[10px] font-bold text-stone-700 uppercase tracking-widest pb-2 border-b border-stone-200">
            Available Documents ({documents.length})
          </div>

          <div className="space-y-2">
            {documents.map((doc) => {
              const isSelected = doc.id === selectedDocId;
              return (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`w-full text-left p-3 transition border text-xs ${
                    isSelected
                      ? 'bg-[#FCFAF7] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400 hover:text-black'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-stone-700 shrink-0" />
                    <span className="font-medium truncate font-sans">{doc.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1 pl-6 font-mono">
                    <span>v{doc.version}</span>
                    <span>By {doc.lastUpdatedBy}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Markdown Editor */}
        <div className="lg:col-span-8 bg-white border border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] space-y-4">
          {selectedDoc ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div>
                  <h2 className="font-serif italic text-2xl text-black tracking-tight font-normal">
                    {selectedDoc.title}
                  </h2>
                  <div className="flex items-center space-x-2 text-[11px] text-stone-500 font-mono mt-0.5 uppercase">
                    <span>Version {selectedDoc.version}</span>
                    <span>•</span>
                    <span>Updated {new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {isSaved && (
                    <span className="flex items-center space-x-1 text-xs text-black font-mono font-bold uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved via WebMCP!</span>
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>Save Document</span>
                  </button>
                </div>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                className="w-full bg-[#FCFAF7] border border-stone-300 p-4 font-mono text-xs text-black leading-relaxed focus:outline-hidden focus:border-black"
              />
            </>
          ) : (
            <div className="text-center py-12 text-stone-400 text-xs font-serif italic">
              Select a document to edit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

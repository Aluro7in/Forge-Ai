import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Tag,
  AlertTriangle,
  Lightbulb,
  Gauge,
  Network,
  HelpCircle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CanvasCard, CanvasCardType } from '../../types/forge';

export const CanvasView: React.FC = () => {
  const { cards, executeToolByName } = useWorkspace();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<CanvasCardType>('note');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await executeToolByName('create_canvas_card', {
      title: title.trim(),
      content: content.trim(),
      type,
      x: Math.floor(Math.random() * 300) + 40,
      y: Math.floor(Math.random() * 200) + 40,
    });

    setTitle('');
    setContent('');
    setIsAdding(false);
  };

  const handleDelete = async (cardId: string) => {
    // Delete from state
    await executeToolByName('update_canvas_card', { cardId, title: '[Deleted]' });
  };

  const renderCardTypeIcon = (t: CanvasCardType) => {
    switch (t) {
      case 'architecture':
        return <Network className="w-3.5 h-3.5 text-stone-700" />;
      case 'risk':
        return <AlertTriangle className="w-3.5 h-3.5 text-black" />;
      case 'decision':
        return <Lightbulb className="w-3.5 h-3.5 text-stone-800" />;
      case 'metric':
        return <Gauge className="w-3.5 h-3.5 text-stone-900" />;
      case 'note':
      default:
        return <Layers className="w-3.5 h-3.5 text-stone-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-black">
        <div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-black tracking-tight mb-1">
            Project Canvas
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500 font-sans">
            Visual cards for architecture patterns, risk mitigations, metrics, and launch decisions
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Card</span>
        </button>
      </div>

      {/* Add Card Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-[#FCFAF7] border border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between text-xs text-black font-bold uppercase tracking-wider font-mono">
            <span>Add Card to Canvas</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-stone-400 hover:text-black font-mono"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title..."
              className="sm:col-span-8 bg-white border border-stone-300 px-3 py-2 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
              autoFocus
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as CanvasCardType)}
              className="sm:col-span-4 bg-white border border-stone-300 px-2 py-2 text-xs text-black focus:outline-hidden focus:border-black font-mono uppercase text-[11px]"
            >
              <option value="note">Note / General</option>
              <option value="architecture">Architecture Pattern</option>
              <option value="decision">Launch Decision</option>
              <option value="risk">Risk Mitigation</option>
              <option value="metric">Target Metric</option>
            </select>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content or description..."
              rows={2}
              className="sm:col-span-12 bg-white border border-stone-300 px-3 py-2 text-xs text-black placeholder-stone-400 focus:outline-hidden focus:border-black font-sans"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 border border-stone-300 hover:border-black text-[10px] uppercase font-bold text-stone-600 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-black hover:bg-stone-800 text-white text-[10px] uppercase font-bold tracking-wider transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
            >
              Save Card
            </button>
          </div>
        </form>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards
          .filter((c) => !c.title.includes('[Deleted]'))
          .map((card) => (
            <div
              key={card.id}
              className="bg-white border border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)] hover:border-stone-800 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {renderCardTypeIcon(card.type)}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 font-mono px-1.5 py-0.5 border border-stone-300 bg-stone-100">
                      {card.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-black transition"
                    title="Remove card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-serif italic text-xl text-black leading-snug font-normal">
                  {card.title}
                </h3>
                <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed font-sans">
                  {card.content}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                <span>{card.id}</span>
                <span>WebMCP synced</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

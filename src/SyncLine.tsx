import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Check, Edit3, Zap } from 'lucide-react';
import { LyricLine, SyncIndex } from './types';

interface SyncLineProps {
  line: LyricLine;
  lIdx: number;
  showSection: boolean;
  isCurrentLine: boolean;
  currentIndex: SyncIndex;
  editingLineIdx: number | null;
  editValue: string;
  isPlaying: boolean;
  setEditValue: (val: string) => void;
  saveEdit: () => void;
  startEditing: (idx: number, text: string) => void;
  handleResetToLine: (idx: number) => void;
  handleSeek: (time: number) => void;
  syncToWordIndex: (idx: number) => void;
}

export const SyncLine = memo(({ 
  line, lIdx, showSection, isCurrentLine, currentIndex, 
  editingLineIdx, editValue, isPlaying, setEditValue, 
  saveEdit, startEditing, handleResetToLine, handleSeek, syncToWordIndex 
}: SyncLineProps) => {
  return (
    <div 
      data-line-index={lIdx}
      className={`group relative transition-all duration-300 ${isCurrentLine ? 'opacity-100' : 'opacity-20 hover:opacity-40'}`}
    >
      {showSection && line.section && (
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
            {line.section}
          </span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>
      )}
      {editingLineIdx === lIdx ? (
      <div className="flex items-center gap-2">
        <input 
          autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          className="flex-1 bg-slate-950 border border-indigo-500/50 rounded-xl px-4 py-2 text-xl font-medium text-white outline-none"
        />
        <button onClick={saveEdit} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500"><Check size={20} /></button>
      </div>
    ) : (
      <div className="flex items-start gap-4">
        <div 
          className="flex-1 flex flex-wrap gap-x-2 gap-y-4 cursor-pointer"
          onClick={() => handleResetToLine(lIdx)}
        >
          {line.words.map((word, wIdx) => {
            const isCurrent = isCurrentLine && currentIndex.wordIndex === wIdx;
            const isSynced = word.startTime !== null;
            return (
              <motion.span 
                key={wIdx} whileHover={{ scale: 1.05 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (word.startTime !== null) handleSeek(word.startTime);
                }}
                className={`px-3 py-1.5 rounded-xl text-3xl font-bold transition-all cursor-pointer ${isCurrent ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 ring-8 ring-indigo-500/10' : ''} ${isSynced && !isCurrent ? 'text-indigo-400 bg-indigo-500/5' : ''} ${!isSynced && !isCurrent ? 'text-slate-700 hover:text-slate-500' : ''}`}
              >
                {word.text}
              </motion.span>
            );
          })}
        </div>
        
        {/* Slider for quick sync - Only for current line */}
        {isCurrentLine && isPlaying && (
          <div className="absolute -bottom-12 left-0 right-0 flex flex-col items-center gap-2 z-10">
            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-4">
              <Zap size={14} className="text-amber-500 animate-pulse" />
              <input 
                type="range"
                min="0"
                max={line.words.length}
                value={currentIndex.wordIndex}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > currentIndex.wordIndex) {
                    syncToWordIndex(val);
                  }
                }}
                className="flex-1 h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              />
            </div>
            <p className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest">Kéo để đồng bộ nhanh</p>
          </div>
        )}

        <button onClick={(e) => { e.stopPropagation(); startEditing(lIdx, line.text); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-indigo-400 transition-all">
          <Edit3 size={18} />
        </button>
      </div>
      )}
    </div>
  );
}, (prev, next) => {
  if (prev.editingLineIdx === prev.lIdx || next.editingLineIdx === next.lIdx) return false;
  if (prev.isCurrentLine || next.isCurrentLine) return false;
  if (prev.line !== next.line) return false;
  return true;
});

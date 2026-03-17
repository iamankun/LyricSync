/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { 
  Play, Pause, Download, Upload, FileJson, FileText, 
  Trash2, Edit3, Check, X, Loader2, Music2, 
  Settings2, ListMusic, Zap, Share2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LyricLine, Word } from './types';
import { useSyncLogic } from './useSyncLogic';
import { exportToJson, exportToSrt, parseSrt } from './utils';
import { SyncLine } from './SyncLine';

type TabType = 'audio' | 'lyrics' | 'sync' | 'export';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('audio');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [rawLyrics, setRawLyrics] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const wavesurfer = useRef<WaveSurfer | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputLyricsRef = useRef<HTMLInputElement>(null);
  const syncContainerRef = useRef<HTMLDivElement>(null);

  const [initialData, setInitialData] = useState<LyricLine[]>([]);
  const getCurrentTime = useCallback(() => {
    if (wavesurfer.current) {
      return wavesurfer.current.getCurrentTime();
    }
    return 0;
  }, []);

  const { 
    syncData, setSyncData, currentIndex, setCurrentIndex, 
    updateLineText, undoSync, resetToLine, handleSyncAction, handleNextLine, syncToWordIndex
  } = useSyncLogic(initialData, getCurrentTime, isPlaying);

  // Tự động cuộn dòng đang đồng bộ vào giữa màn hình
  useEffect(() => {
    if (activeTab === 'sync' && syncContainerRef.current) {
      const activeLine = syncContainerRef.current.querySelector(`[data-line-index="${currentIndex.lineIndex}"]`);
      if (activeLine) {
        activeLine.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }, [currentIndex.lineIndex, activeTab]);

  useEffect(() => {
    if (!waveformRef.current || !audioFile) return;

    const url = URL.createObjectURL(audioFile);
    
    try {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#94a3b8',
        progressColor: '#818cf8',
        cursorColor: '#f43f5e',
        barWidth: 2,
        barGap: 1,
        height: 64,
        normalize: true,
        minPxPerSec: 0,
        fillParent: true,
        interact: true,
        dragToSeek: true,
      });

      wavesurfer.current = ws;
      ws.load(url);

      ws.on('ready', () => {
        setDuration(ws.getDuration());
        setIsReady(true);
      });

      ws.on('error', (err) => {
        console.error('WaveSurfer Error:', err);
      });

      ws.on('audioprocess', () => {
        setCurrentTime(ws.getCurrentTime());
      });

      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => setIsPlaying(false));
      ws.on('interaction', () => {
        setCurrentTime(ws.getCurrentTime());
      });

      return () => {
        ws.destroy();
        wavesurfer.current = null;
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Lỗi khởi tạo WaveSurfer:', error);
    }
  }, [audioFile]);

  // Tự động parse lời nhạc khi chuyển sang tab Sync nếu syncData đang trống và chưa có initialData
  useEffect(() => {
    if (activeTab === 'sync' && syncData.length === 0 && initialData.length === 0 && rawLyrics.trim()) {
      handleParseLyrics();
    }
  }, [activeTab, syncData.length, initialData.length, rawLyrics]);

  const handleLyricsFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          setInitialData(data);
          
          // Tái cấu trúc văn bản thô bao gồm cả các thẻ section
          const textLines: string[] = [];
          let lastSection = '';
          data.forEach((l: LyricLine) => {
            if (l.section && l.section !== lastSection) {
              textLines.push(`#${l.section}`);
              lastSection = l.section;
            }
            textLines.push(l.text);
          });
          setRawLyrics(textLines.join('\n'));
          setActiveTab('sync');
        } catch (err) {
          alert('Lỗi định dạng tệp JSON');
        }
      } else if (file.name.endsWith('.srt')) {
        const data = parseSrt(content);
        setInitialData(data);
        const text = data.map((l: LyricLine) => l.text).join('\n');
        setRawLyrics(text);
        setActiveTab('sync');
      }
    };
    reader.readAsText(file);
  };

  const handleParseLyrics = () => {
    if (!rawLyrics.trim()) return;
    const lines = rawLyrics.split('\n').filter(l => l.trim());
    const parsedData: LyricLine[] = [];
    let currentSection = 'Verse';

    lines.forEach(lineText => {
      const trimmed = lineText.trim();
      // Sử dụng regex để kiểm tra thẻ section (bắt đầu bằng #)
      if (trimmed.startsWith('#')) {
        // Chuyển đổi sang lowercase như yêu cầu ví dụ: #Pre-Chorus => "pre-chorus"
        currentSection = trimmed.substring(1).trim().toLowerCase();
      } else {
        const words: Word[] = trimmed.split(/\s+/).map(word => ({
          text: word,
          startTime: null,
          endTime: null,
        }));
        parsedData.push({ 
          section: currentSection || 'verse', 
          startTime: null, 
          endTime: null, 
          text: trimmed, 
          words 
        });
      }
    });
    setInitialData(parsedData);
    // Reset lại vị trí đồng bộ khi parse mới
    setCurrentIndex({ lineIndex: 0, wordIndex: 0 });
  };

  const togglePlay = () => {
    if (wavesurfer.current && isReady) wavesurfer.current.playPause();
  };

  const handleSeek = useCallback((time: number) => {
    if (wavesurfer.current && isReady) wavesurfer.current.setTime(time);
  }, [isReady]);

  const resetSync = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ tiến trình đồng bộ?')) {
      const resetData = syncData.map(line => ({
        ...line,
        startTime: null,
        endTime: null,
        words: line.words.map(word => ({ ...word, startTime: null, endTime: null }))
      }));
      setSyncData(resetData);
      setCurrentIndex({ lineIndex: 0, wordIndex: 0 });
    }
  };

  const startEditing = useCallback((idx: number, text: string) => {
    setEditingLineIdx(idx);
    setEditValue(text);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingLineIdx !== null) {
      updateLineText(editingLineIdx, editValue);
      setEditingLineIdx(null);
    }
  }, [editingLineIdx, editValue, updateLineText]);

  const handleUndo = () => {
    const seekTime = undoSync();
    if (seekTime !== null) {
      handleSeek(seekTime);
    }
  };

  const handleResetToLine = useCallback((idx: number) => {
    if (idx <= currentIndex.lineIndex) {
      const seekTime = resetToLine(idx);
      handleSeek(seekTime);
    }
  }, [currentIndex.lineIndex, resetToLine, handleSeek]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const tabs = [
    { id: 'audio', label: 'Âm thanh', icon: Music2 },
    { id: 'lyrics', label: 'Lời nhạc', icon: FileText },
    { id: 'sync', label: 'Đồng bộ', icon: Zap },
    { id: 'export', label: 'Xuất bản', icon: Share2 },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Settings2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">LyricSync <span className="text-indigo-400 font-medium">Studio</span></h1>
          </div>
          
          {/* Tab Navigation */}
          <nav className="hidden md:flex items-center bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest hidden sm:block">An Kun Studio v2.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 pb-40">
        <AnimatePresence mode="wait">
          {/* Tab 1: Audio Setup */}
          {activeTab === 'audio' && (
            <motion.div 
              key="audio" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif italic text-white">Quản lý Âm thanh</h2>
                <p className="text-slate-500">Tải lên hoặc thay đổi tệp nhạc của bạn.</p>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`group border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${audioFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={(e) => {
                    setAudioFile(e.target.files?.[0] || null);
                    setIsReady(false);
                  }} accept="audio/*" className="hidden" />
                  <div className="flex flex-col items-center gap-6">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${audioFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      <Upload size={40} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-200">{audioFile ? audioFile.name : 'Chọn tệp âm thanh'}</p>
                      <p className="text-sm text-slate-500 mt-2">Hỗ trợ MP3, WAV, M4A. Tối đa 50MB.</p>
                    </div>
                  </div>
                </div>

                {audioFile && (
                  <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                        <Music2 size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">Trạng thái tệp</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">{isReady ? 'Sẵn sàng biên tập' : 'Đang xử lý...'}</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('lyrics')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">
                      Tiếp theo: Lời nhạc
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Lyrics Editor */}
          {activeTab === 'lyrics' && (
            <motion.div 
              key="lyrics" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif italic text-white">Biên tập Lời nhạc</h2>
                <p className="text-slate-500">Dán và chỉnh sửa văn bản thô trước khi đồng bộ.</p>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6">
                <textarea 
                  value={rawLyrics}
                  onChange={(e) => setRawLyrics(e.target.value)}
                  placeholder="Dán lời bài hát tại đây... Mỗi dòng sẽ là một câu hát."
                  className="w-full h-[450px] p-8 rounded-3xl bg-slate-950 border border-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none font-sans text-lg text-slate-300 leading-relaxed"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-500 font-medium">
                      {rawLyrics.split('\n').filter(l => l.trim()).length} dòng lời nhạc
                    </div>
                    <button 
                      onClick={() => fileInputLyricsRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700"
                    >
                      <Upload size={14} />
                      Tải lên JSON/SRT
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputLyricsRef} 
                      onChange={handleLyricsFileUpload} 
                      accept=".json,.srt" 
                      className="hidden" 
                    />
                  </div>
                  <button 
                    onClick={() => {
                      handleParseLyrics();
                      setActiveTab('sync');
                    }}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                  >
                    Cập nhật & Đồng bộ
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Sync Interface */}
          {activeTab === 'sync' && (
            <motion.div 
              key="sync" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-10"
            >
              <div className="xl:col-span-8">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-800 min-h-[600px] relative">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                      <Zap size={14} className="text-indigo-500" /> Chế độ đồng bộ thời gian thực
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleUndo}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all border border-slate-700"
                      >
                        <Loader2 size={14} className="rotate-180" /> Hoàn tác (Back)
                      </button>
                      <button onClick={resetSync} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div ref={syncContainerRef} className="space-y-24 pb-60">
                    {syncData.length > 0 ? syncData.map((line, lIdx) => {
                      const showSection = lIdx === 0 || syncData[lIdx - 1].section !== line.section;
                      const isCurrentLine = currentIndex.lineIndex === lIdx;
                      return (
                        <SyncLine
                          key={lIdx}
                          line={line}
                          lIdx={lIdx}
                          showSection={showSection}
                          isCurrentLine={isCurrentLine}
                          currentIndex={currentIndex}
                          editingLineIdx={editingLineIdx}
                          editValue={editValue}
                          isPlaying={isPlaying}
                          setEditValue={setEditValue}
                          saveEdit={saveEdit}
                          startEditing={startEditing}
                          handleResetToLine={handleResetToLine}
                          handleSeek={handleSeek}
                          syncToWordIndex={syncToWordIndex}
                        />
                      );
                    }) : (
                      <div className="text-center py-20 space-y-4">
                        <p className="text-slate-500 italic">Chưa có dữ liệu lời nhạc. Hãy quay lại tab Lời nhạc.</p>
                        <button onClick={() => setActiveTab('lyrics')} className="text-indigo-400 font-bold hover:underline">Đến Tab Lời nhạc</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-4 space-y-8">
                <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Tiến độ đồng bộ</h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar max-h-[400px]">
                    {syncData.map((line, lIdx) => (
                      <div key={lIdx} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-black text-slate-600">DÒNG {lIdx + 1}</span>
                          {line.startTime !== null && (
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {formatTime(line.startTime)} → {formatTime(line.endTime || 0)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {line.words.map((word, wIdx) => (
                            word.startTime !== null && (
                              <button key={wIdx} onClick={() => handleSeek(word.startTime!)} className="group bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-left transition-all hover:border-indigo-500/50">
                                <div className="text-xs font-bold text-slate-300">{word.text}</div>
                                <div className="text-[9px] font-mono text-slate-600 mt-1">{word.startTime.toFixed(2)}s</div>
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 4: Export */}
          {activeTab === 'export' && (
            <motion.div 
              key="export" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-10"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif italic text-white">Xuất bản Dự án</h2>
                <p className="text-slate-500">Tải về kết quả đồng bộ của bạn.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 text-center">
                  <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto">
                    <FileJson size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Định dạng JSON</h3>
                    <p className="text-sm text-slate-500">Dữ liệu đầy đủ bao gồm word-by-word timing cho các ứng dụng web.</p>
                  </div>
                  <button onClick={() => exportToJson(syncData)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all">
                    Tải JSON
                  </button>
                </div>

                <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 text-center">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto">
                    <ListMusic size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Định dạng SRT</h3>
                    <p className="text-sm text-slate-500">Định dạng phụ đề tiêu chuẩn cho video và trình phát nhạc.</p>
                  </div>
                  <button onClick={() => exportToSrt(syncData)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all">
                    Tải SRT
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm font-medium tracking-wide">
            ©LyricSync Studio được phát triển bởi <span className="text-indigo-400 font-bold">An Kun Studio</span>. All right reserver.
          </p>
        </div>
      </footer>

      {/* Sticky Music Player (Persistent Bottom Player) */}
      <AnimatePresence>
        {audioFile && (
          <motion.footer 
            key={audioFile.name}
            initial={{ y: 100 }} animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800 px-6 py-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/3 order-2 md:order-1">
                <div 
                  ref={waveformRef} 
                  className="w-full h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative"
                >
                  {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-[10px] font-bold text-slate-600 animate-pulse uppercase tracking-widest">
                        Đang tải sóng âm...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex items-center gap-6 w-full order-1 md:order-2">
                <button 
                  disabled={!isReady} onClick={togglePlay}
                  className="w-14 h-14 bg-white text-slate-950 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform shadow-xl disabled:opacity-50"
                >
                  {!isReady ? <Loader2 size={28} className="animate-spin text-indigo-600" /> : isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
                </button>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <span className="text-indigo-400">{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer group">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                    />
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-end gap-1 order-3 w-1/4">
                <div className="text-xs font-bold text-white truncate max-w-full">{audioFile.name}</div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Dòng {currentIndex.lineIndex + 1}</span>
                  <div className="w-1 h-1 bg-slate-700 rounded-full my-auto" />
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Từ {currentIndex.wordIndex + 1}</span>
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

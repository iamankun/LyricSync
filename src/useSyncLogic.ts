import { useState, useCallback, useEffect } from 'react';
import { LyricLine, SyncIndex } from './types';

export const useSyncLogic = (
  initialData: LyricLine[],
  getCurrentTime: () => number,
  isPlaying: boolean
) => {
  const [syncData, setSyncData] = useState<LyricLine[]>(initialData);
  const [currentIndex, setCurrentIndex] = useState<SyncIndex>({ lineIndex: 0, wordIndex: 0 });

  useEffect(() => {
    if (initialData.length > 0) {
      setSyncData(initialData);
      
      // Tìm vị trí chưa đồng bộ đầu tiên
      let found = false;
      for (let l = 0; l < initialData.length; l++) {
        const line = initialData[l];
        for (let w = 0; w < line.words.length; w++) {
          if (line.words[w].startTime === null) {
            setCurrentIndex({ lineIndex: l, wordIndex: w });
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      // Nếu đã đồng bộ hết, đặt ở cuối
      if (!found) {
        setCurrentIndex({ lineIndex: initialData.length, wordIndex: 0 });
      }
    }
  }, [initialData]);

  const handleNextLine = useCallback(() => {
    if (!isPlaying) return;
    const time = getCurrentTime();

    setSyncData((prev) => {
      const newData = [...prev];
      const { lineIndex, wordIndex } = currentIndex;

      if (lineIndex >= newData.length) return prev;

      const currentLine = { ...newData[lineIndex] };
      const currentWords = [...currentLine.words];
      
      // Chốt endTime cho từ cuối cùng của dòng (nếu chưa có)
      const lastWordIdx = currentWords.length - 1;
      if (currentWords[lastWordIdx] && currentWords[lastWordIdx].endTime === null) {
        const lastWord = { ...currentWords[lastWordIdx] };
        lastWord.endTime = time;
        currentWords[lastWordIdx] = lastWord;
      }

      currentLine.endTime = time;
      currentLine.words = currentWords;
      newData[lineIndex] = currentLine;

      let nextLineIndex = lineIndex + 1;
      
      if (nextLineIndex < newData.length) {
        setCurrentIndex({ lineIndex: nextLineIndex, wordIndex: 0 });
      } else {
        setCurrentIndex({ lineIndex: newData.length, wordIndex: 0 });
      }

      return newData;
    });
  }, [currentIndex, isPlaying, getCurrentTime]);

  const handleSyncAction = useCallback(() => {
    if (!isPlaying) return;
    const time = getCurrentTime();

    setSyncData((prev) => {
      const newData = [...prev];
      const { lineIndex, wordIndex } = currentIndex;

      if (lineIndex >= newData.length) return prev;

      const currentLine = { ...newData[lineIndex] };
      const currentWords = [...currentLine.words];
      
      // 1. Ghi nhận cho từ hiện tại
      const currentWord = { ...currentWords[wordIndex] };
      currentWord.startTime = time;
      currentWords[wordIndex] = currentWord;

      // 2. Chốt endTime cho từ trước đó (nếu có trong cùng dòng)
      if (wordIndex > 0) {
        const prevWord = { ...currentWords[wordIndex - 1] };
        prevWord.endTime = time;
        currentWords[wordIndex - 1] = prevWord;
      }

      // 3. Nếu là từ đầu tiên của dòng, gán startTime cho dòng
      if (wordIndex === 0) {
        currentLine.startTime = time;
      }

      // Chuyển sang từ tiếp theo
      const nextWordIndex = wordIndex + 1;
      if (nextWordIndex < currentWords.length) {
        currentLine.words = currentWords;
        newData[lineIndex] = currentLine;
        setCurrentIndex({ lineIndex, wordIndex: nextWordIndex });
      } else {
        // TỰ ĐỘNG XUỐNG DÒNG NGAY LẬP TỨC TRONG CÙNG 1 CHU KỲ STATE
        // Không dùng setTimeout nữa để loại bỏ độ trễ
        const lastIdx = currentWords.length - 1;
        if (currentWords[lastIdx]) {
          currentWords[lastIdx].endTime = time;
        }
        currentLine.endTime = time;
        currentLine.words = currentWords;
        newData[lineIndex] = currentLine;

        const nextLineIndex = lineIndex + 1;
        if (nextLineIndex < newData.length) {
          setCurrentIndex({ lineIndex: nextLineIndex, wordIndex: 0 });
        } else {
          setCurrentIndex({ lineIndex: newData.length, wordIndex: 0 });
        }
      }

      return newData;
    });
  }, [currentIndex, isPlaying, getCurrentTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleSyncAction();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        handleNextLine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSyncAction, handleNextLine]);

  const updateLineText = (lineIdx: number, newText: string) => {
    setSyncData(prev => {
      const newData = [...prev];
      const words = newText.trim().split(/\s+/).map(word => ({
        text: word,
        startTime: null,
        endTime: null,
      }));
      newData[lineIdx] = { ...newData[lineIdx], text: newText, words };
      return newData;
    });
  };

  const undoSync = useCallback(() => {
    let prevLineIndex = currentIndex.lineIndex;
    let prevWordIndex = currentIndex.wordIndex - 1;

    if (prevWordIndex < 0) {
      prevLineIndex = currentIndex.lineIndex - 1;
      if (prevLineIndex < 0) return null; // Không còn gì để hoàn tác
      prevWordIndex = syncData[prevLineIndex].words.length - 1;
    }

    setSyncData(prev => {
      const newData = [...prev];
      const line = { ...newData[prevLineIndex] };
      const words = [...line.words];
      
      const word = { ...words[prevWordIndex] };
      word.startTime = null;
      word.endTime = null;
      words[prevWordIndex] = word;

      if (prevWordIndex === 0) {
        line.startTime = null;
      }
      
      if (currentIndex.lineIndex > prevLineIndex) {
        line.endTime = null;
      }

      line.words = words;
      newData[prevLineIndex] = line;
      return newData;
    });

    setCurrentIndex({ lineIndex: prevLineIndex, wordIndex: prevWordIndex });
    
    const targetLine = syncData[prevLineIndex];
    if (prevWordIndex > 0) {
      return targetLine.words[prevWordIndex - 1].startTime;
    } else if (prevLineIndex > 0) {
      const lastLine = syncData[prevLineIndex - 1];
      return lastLine.words[lastLine.words.length - 1].startTime;
    }
    return 0;
  }, [currentIndex, syncData]);

  const resetToLine = useCallback((lineIdx: number) => {
    setSyncData(prev => {
      return prev.map((line, idx) => {
        if (idx < lineIdx) return line;
        return {
          ...line,
          startTime: null,
          endTime: null,
          words: line.words.map(w => ({ ...w, startTime: null, endTime: null }))
        };
      });
    });
    setCurrentIndex({ lineIndex: lineIdx, wordIndex: 0 });
    
    if (lineIdx > 0) {
      const prevLine = syncData[lineIdx - 1];
      return prevLine.startTime || 0;
    }
    return 0;
  }, [syncData]);

  return {
    syncData,
    setSyncData,
    currentIndex,
    setCurrentIndex,
    updateLineText,
    undoSync,
    resetToLine,
    handleSyncAction,
    handleNextLine,
    syncToWordIndex: useCallback((targetWordIndex: number) => {
      if (!isPlaying) return;
      const time = getCurrentTime();

      setSyncData((prev) => {
        const newData = [...prev];
        const { lineIndex, wordIndex } = currentIndex;

        if (lineIndex >= newData.length) return prev;

        const currentLine = { ...newData[lineIndex] };
        const currentWords = [...currentLine.words];
        
        for (let i = wordIndex; i < targetWordIndex; i++) {
          const word = { ...currentWords[i] };
          word.startTime = time;
          
          if (i > 0) {
            const prevWord = { ...currentWords[i - 1] };
            prevWord.endTime = time;
            currentWords[i - 1] = prevWord;
          }
          
          if (i === 0) {
            currentLine.startTime = time;
          }
          
          currentWords[i] = word;
        }

        currentLine.words = currentWords;
        newData[lineIndex] = currentLine;

        if (targetWordIndex < currentWords.length) {
          setCurrentIndex({ lineIndex, wordIndex: targetWordIndex });
        } else {
          const lastIdx = currentWords.length - 1;
          if (currentWords[lastIdx]) {
            currentWords[lastIdx].endTime = time;
          }
          currentLine.endTime = time;
          newData[lineIndex] = currentLine;
          
          const nextLineIndex = lineIndex + 1;
          setCurrentIndex({ lineIndex: nextLineIndex, wordIndex: 0 });
        }

        return newData;
      });
    }, [currentIndex, isPlaying, getCurrentTime])
  };
};


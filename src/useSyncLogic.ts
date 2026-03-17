/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { LyricLine, SyncIndex } from './types';

export const useSyncLogic = (
  initialData: LyricLine[],
  currentTime: number,
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
        lastWord.endTime = currentTime;
        currentWords[lastWordIdx] = lastWord;
      }

      currentLine.endTime = currentTime;
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
  }, [currentIndex, currentTime, isPlaying]);

  const handleSyncAction = useCallback(() => {
    if (!isPlaying) return;

    setSyncData((prev) => {
      const newData = [...prev];
      const { lineIndex, wordIndex } = currentIndex;

      if (lineIndex >= newData.length) return prev;

      const currentLine = { ...newData[lineIndex] };
      const currentWords = [...currentLine.words];
      
      // 1. Ghi nhận cho từ hiện tại
      const currentWord = { ...currentWords[wordIndex] };
      currentWord.startTime = currentTime;
      currentWords[wordIndex] = currentWord;

      // 2. Chốt endTime cho từ trước đó (nếu có trong cùng dòng)
      if (wordIndex > 0) {
        const prevWord = { ...currentWords[wordIndex - 1] };
        prevWord.endTime = currentTime;
        currentWords[wordIndex - 1] = prevWord;
      }

      // 3. Nếu là từ đầu tiên của dòng, gán startTime cho dòng
      if (wordIndex === 0) {
        currentLine.startTime = currentTime;
      }

      currentLine.words = currentWords;
      newData[lineIndex] = currentLine;

      // Chuyển sang từ tiếp theo
      const nextWordIndex = wordIndex + 1;
      if (nextWordIndex < currentWords.length) {
        setCurrentIndex({ lineIndex, wordIndex: nextWordIndex });
      } else {
        // TỰ ĐỘNG XUỐNG DÒNG: Đã hết từ, tự động gọi logic chuyển dòng
        setTimeout(() => handleNextLine(), 0);
      }

      return newData;
    });
  }, [currentIndex, currentTime, isPlaying, handleNextLine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tránh trigger khi đang gõ trong input/textarea
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

      // Nếu là từ đầu tiên, xóa startTime của dòng
      if (prevWordIndex === 0) {
        line.startTime = null;
      }
      
      // Xóa endTime của dòng nếu lùi từ dòng sau về
      if (currentIndex.lineIndex > prevLineIndex) {
        line.endTime = null;
      }

      line.words = words;
      newData[prevLineIndex] = line;
      return newData;
    });

    setCurrentIndex({ lineIndex: prevLineIndex, wordIndex: prevWordIndex });
    
    // Trả về thời gian của từ trước đó để seek nhạc (nếu có)
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
    
    // Trả về thời gian của dòng trước đó để seek nhạc
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

      setSyncData((prev) => {
        const newData = [...prev];
        const { lineIndex, wordIndex } = currentIndex;

        if (lineIndex >= newData.length) return prev;

        const currentLine = { ...newData[lineIndex] };
        const currentWords = [...currentLine.words];
        
        // Đồng bộ tất cả các từ từ wordIndex hiện tại đến targetWordIndex
        for (let i = wordIndex; i < targetWordIndex; i++) {
          const word = { ...currentWords[i] };
          word.startTime = currentTime;
          
          // Chốt endTime cho từ trước đó
          if (i > 0) {
            const prevWord = { ...currentWords[i - 1] };
            prevWord.endTime = currentTime;
            currentWords[i - 1] = prevWord;
          }
          
          if (i === 0) {
            currentLine.startTime = currentTime;
          }
          
          currentWords[i] = word;
        }

        currentLine.words = currentWords;
        newData[lineIndex] = currentLine;

        if (targetWordIndex < currentWords.length) {
          setCurrentIndex({ lineIndex, wordIndex: targetWordIndex });
        } else {
          // Nếu đã đồng bộ hết dòng, chốt endTime cho từ cuối và chuyển dòng
          const lastIdx = currentWords.length - 1;
          if (currentWords[lastIdx]) {
            currentWords[lastIdx].endTime = currentTime;
          }
          currentLine.endTime = currentTime;
          newData[lineIndex] = currentLine;
          
          const nextLineIndex = lineIndex + 1;
          setCurrentIndex({ lineIndex: nextLineIndex, wordIndex: 0 });
        }

        return newData;
      });
    }, [currentIndex, currentTime, isPlaying])
  };
};

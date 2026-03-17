/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Word, LyricLine } from './types';

/**
 * Chuyển đổi dữ liệu đồng bộ sang định dạng JSON
 */
export const exportToJson = (data: LyricLine[]) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lyrics.json';
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Định dạng thời gian giây sang định dạng SRT (HH:MM:SS,mmm)
 */
const formatSrtTime = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
  return `${hh}:${mm}:${ss},${ms}`;
};

/**
 * Xuất dữ liệu sang định dạng SRT
 */
export const exportToSrt = (data: LyricLine[]) => {
  let srtContent = '';
  data.forEach((line, index) => {
    if (line.startTime !== null && line.endTime !== null) {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(line.startTime)} --> ${formatSrtTime(line.endTime)}\n`;
      srtContent += `${line.text}\n\n`;
    }
  });

  const blob = new Blob([srtContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lyrics.srt';
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Chuyển đổi định dạng thời gian SRT (HH:MM:SS,mmm) sang giây
 */
const srtTimeToSeconds = (timeStr: string): number => {
  const [time, ms] = timeStr.split(',');
  const [hh, mm, ss] = time.split(':').map(Number);
  return hh * 3600 + mm * 60 + ss + Number(ms) / 1000;
};

/**
 * Phân tích cú pháp tệp SRT thành LyricLine[]
 */
export const parseSrt = (srtContent: string): LyricLine[] => {
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  const parsedData: LyricLine[] = [];

  blocks.forEach(block => {
    const parts = block.split(/\r?\n/);
    if (parts.length >= 3) {
      const timeMatch = parts[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      if (timeMatch) {
        const startTime = srtTimeToSeconds(timeMatch[1]);
        const endTime = srtTimeToSeconds(timeMatch[2]);
        const text = parts.slice(2).join(' ');
        
        const words: Word[] = text.trim().split(/\s+/).map(word => ({
          text: word,
          startTime: null,
          endTime: null,
        }));

        parsedData.push({
          section: 'verse',
          startTime,
          endTime,
          text,
          words
        });
      }
    }
  });

  return parsedData;
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Word {
  text: string;
  startTime: number | null; // null khi chưa được đồng bộ
  endTime: number | null;
}

export interface LyricLine {
  section: string; // VD: "Verse", "Chorus"
  startTime: number | null;
  endTime: number | null;
  text: string; // Câu hoàn chỉnh
  words: Word[]; // Mảng các từ trong câu
}

export type SyncData = LyricLine[];

export interface SyncIndex {
  lineIndex: number;
  wordIndex: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
}

export enum NoteColor {
  DEFAULT = 'bg-white dark:bg-slate-800',
  RED = 'bg-red-100 dark:bg-red-900',
  ORANGE = 'bg-orange-100 dark:bg-orange-900',
  YELLOW = 'bg-yellow-100 dark:bg-yellow-900',
  GREEN = 'bg-green-100 dark:bg-green-900',
  TEAL = 'bg-teal-100 dark:bg-teal-900',
  BLUE = 'bg-blue-100 dark:bg-blue-900',
  PURPLE = 'bg-purple-100 dark:bg-purple-900',
}

export const COLOR_PALETTE = [
  NoteColor.DEFAULT,
  NoteColor.RED,
  NoteColor.ORANGE,
  NoteColor.YELLOW,
  NoteColor.GREEN,
  NoteColor.TEAL,
  NoteColor.BLUE,
  NoteColor.PURPLE,
];
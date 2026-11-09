import type { EditorState } from '@codemirror/state';

/** Lines containing any selection range. */
export const activeLineNumbers = (state: EditorState): ReadonlySet<number> => {
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const start = state.doc.lineAt(range.from).number;
    const end = state.doc.lineAt(range.to).number;
    for (let line = start; line <= end; line += 1) lines.add(line);
  }
  return lines;
};

export const isActiveLine = (
  state: EditorState,
  position: number,
  activeLines: ReadonlySet<number>,
): boolean => activeLines.has(state.doc.lineAt(position).number);

/** True when two ranges touch, used for inline spans that span lines. */
export const rangesTouch = (
  from: number,
  to: number,
  otherFrom: number,
  otherTo: number,
): boolean => from <= otherTo && to >= otherFrom;

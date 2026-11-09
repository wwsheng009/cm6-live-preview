import type { Extension, Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

export interface CalloutRange {
  readonly from: number;
  readonly to: number;
  readonly type: string;
  readonly title: string;
}

const CALLOUT = /^>\s*\[!([a-zA-Z0-9_-]+)\][+-]?\s*(.*)$/;

/** Find Obsidian-style blockquote callouts. */
export const scanCallouts = (value: string): readonly CalloutRange[] => {
  const lines = value.split('\n');
  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  const ranges: CalloutRange[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = CALLOUT.exec(lines[index] ?? '');
    if (match === null) continue;
    let end = index;
    while (end + 1 < lines.length && /^\s*>/.test(lines[end + 1] ?? '')) {
      end += 1;
    }
    ranges.push({
      from: offsets[index] ?? 0,
      to: (offsets[end] ?? 0) + (lines[end]?.length ?? 0),
      type: (match[1] ?? 'note').toLocaleLowerCase(),
      title: (match[2] ?? '').trim(),
    });
    index = end;
  }
  return ranges;
};

const buildCalloutDecorations = (state: EditorView['state']): DecorationSet => {
  const ranges: Range<Decoration>[] = [];
  const seen = new Set<number>();
  for (const callout of scanCallouts(state.doc.toString())) {
    const start = state.doc.lineAt(callout.from);
    const end = state.doc.lineAt(callout.to);
    for (let line = start.number; line <= end.number; line += 1) {
      const from = state.doc.line(line).from;
      if (seen.has(from)) continue;
      seen.add(from);
      ranges.push(
        Decoration.line({
          class: `cm-live-callout cm-live-callout--${callout.type}`,
        }).range(from),
      );
    }
  }
  return Decoration.set(ranges, true);
};

/** Style blockquote callouts while preserving the Markdown source. */
export const callouts = (): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildCalloutDecorations(view.state);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.decorations = buildCalloutDecorations(update.state);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );

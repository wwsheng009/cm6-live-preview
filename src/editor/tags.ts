import type { Extension, Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

export interface TagRange {
  readonly from: number;
  readonly to: number;
  readonly tag: string;
}

const FENCE = /^(`{3,}|~{3,})/;
const TAG = /(^|[\s([{>])#([\p{L}\p{N}_/-]+)/gu;

const maskInlineCode = (line: string): string => {
  const chars = line.split('');
  let index = 0;
  while (index < chars.length) {
    if (chars[index] !== '`') {
      index += 1;
      continue;
    }
    let count = 1;
    while (chars[index + count] === '`') count += 1;
    const marker = '`'.repeat(count);
    const close = line.indexOf(marker, index + count);
    const end = close < 0 ? line.length : close + count;
    for (let i = index; i < end; i += 1) chars[i] = ' ';
    index = end;
  }
  return chars.join('');
};

/** Find `#tag` tokens while skipping fenced and inline code. */
export const scanTags = (value: string): readonly TagRange[] => {
  const ranges: TagRange[] = [];
  let offset = 0;
  let fence: { readonly char: string; readonly marker: string } | null = null;

  for (const line of value.split('\n')) {
    const lineOffset = offset;
    offset += line.length + 1;
    const fenceMatch = FENCE.exec(line.trimStart());

    if (fence !== null) {
      if (
        fenceMatch !== null &&
        fenceMatch[1]?.startsWith(fence.char) === true &&
        (fenceMatch[1]?.length ?? 0) >= fence.marker.length
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch !== null) {
      const marker = fenceMatch[1] ?? '';
      fence = { char: marker[0] ?? '`', marker };
      continue;
    }

    const masked = maskInlineCode(line);
    TAG.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG.exec(masked)) !== null) {
      const tag = match[2] ?? '';
      if (tag === '') continue;
      const from = lineOffset + match.index + (match[1]?.length ?? 0);
      ranges.push({ from, to: from + tag.length + 1, tag });
    }
  }
  return ranges;
};

const buildTagDecorations = (state: EditorView['state']): DecorationSet => {
  const ranges: Range<Decoration>[] = [];
  for (const range of scanTags(state.doc.toString())) {
    ranges.push(
      Decoration.mark({
        class: 'cm-live-tag',
        attributes: { 'data-tag': range.tag },
      }).range(range.from, range.to),
    );
  }
  return Decoration.set(ranges, true);
};

export interface TagsOptions {
  readonly onOpen?: (tag: string) => void;
}

export const inlineTags = (options: TagsOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildTagDecorations(view.state);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.decorations = buildTagDecorations(update.state);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  ),
  EditorView.domEventHandlers({
    click: (event) => {
      if (!(event.ctrlKey || event.metaKey)) return false;
      if (!(event.target instanceof Element)) return false;
      const element = event.target.closest<HTMLElement>('.cm-live-tag');
      const tag = element?.dataset.tag?.trim() ?? '';
      if (tag === '') return false;
      event.preventDefault();
      options.onOpen?.(tag);
      return true;
    },
  }),
];

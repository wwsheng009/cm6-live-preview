import katex from 'katex';
import type { Extension, Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

import { activeLineNumbers, isActiveLine } from './core/syntax';

export interface MathRange {
  readonly from: number;
  readonly to: number;
  readonly expression: string;
  readonly display: boolean;
}

const FENCE = /^(`{3,}|~{3,})/;
const MATH = /(?<!\\)\$\$([^$\n]+)\$\$|(?<!\\)\$([^$\n]+)\$/g;

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

/** Find single-line inline and display math outside code. */
export const scanMath = (value: string): readonly MathRange[] => {
  const ranges: MathRange[] = [];
  let offset = 0;
  let fence: { readonly char: string; readonly marker: string } | null = null;

  for (const line of value.split('\n')) {
    const lineOffset = offset;
    offset += line.length + 1;
    const trimmed = line.trimStart();
    const fenceMatch = FENCE.exec(trimmed);

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
    MATH.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MATH.exec(masked)) !== null) {
      const display = match[1] !== undefined;
      const rawExpression = display ? match[1] : match[2];
      const expression = (rawExpression ?? '').trim();
      if (expression === '') continue;
      if (!display && /^\s|\s$/.test(rawExpression ?? '')) continue;
      ranges.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + match[0].length,
        expression,
        display,
      });
    }
  }

  return ranges.sort((left, right) => left.from - right.from);
};

class MathWidget extends WidgetType {
  constructor(
    readonly expression: string,
    readonly display: boolean,
  ) {
    super();
  }

  eq(other: MathWidget): boolean {
    return (
      other.expression === this.expression && other.display === this.display
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement(
      this.display ? 'div' : 'span',
    );
    wrapper.className = this.display
      ? 'cm-live-math cm-live-math--block'
      : 'cm-live-math';
    try {
      wrapper.innerHTML = katex.renderToString(this.expression, {
        displayMode: this.display,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch {
      wrapper.textContent = this.display
        ? `$$${this.expression}$$`
        : `$${this.expression}$`;
    }
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const buildMathDecorations = (view: EditorView): DecorationSet => {
  const state = view.state;
  const activeLines = activeLineNumbers(state);
  const ranges: Range<Decoration>[] = [];
  for (const range of scanMath(state.doc.toString())) {
    if (isActiveLine(state, range.from, activeLines)) continue;
    ranges.push(
      Decoration.replace({
        widget: new MathWidget(range.expression, range.display),
      }).range(range.from, range.to),
    );
  }
  return Decoration.set(ranges, true);
};

/** Render KaTeX spans on inactive lines. */
export const mathPreview = (): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildMathDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet) {
          this.decorations = buildMathDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );

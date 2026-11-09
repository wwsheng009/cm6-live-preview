import katex from 'katex';
import {
  StateField,
  type EditorState,
  type Extension,
  type Range,
} from '@codemirror/state';
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
const INLINE_MATH = /(?<!\\)\$([^$\n]+?)\$/g;

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

/** Find inline and multi-line display math outside code. */
export const scanMath = (value: string): readonly MathRange[] => {
  const lines = value.split('\n');
  const offsets: number[] = [];
  let runningOffset = 0;
  for (const line of lines) {
    offsets.push(runningOffset);
    runningOffset += line.length + 1;
  }

  const ranges: MathRange[] = [];
  let fence: { readonly char: string; readonly marker: string } | null = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? '';
    const lineOffset = offsets[lineIndex] ?? 0;
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
    let inlineSource = masked;
    const blockStart = masked.indexOf('$$');
    if (blockStart >= 0) {
      const sameLineClose = masked.indexOf('$$', blockStart + 2);
      if (sameLineClose >= 0) {
        const expression = line
          .slice(blockStart + 2, sameLineClose)
          .trim();
        if (expression !== '') {
          ranges.push({
            from: lineOffset + blockStart,
            to: lineOffset + sameLineClose + 2,
            expression,
            display: true,
          });
        }
        inlineSource =
          masked.slice(0, blockStart) +
          ' '.repeat(sameLineClose + 2 - blockStart) +
          masked.slice(sameLineClose + 2);
      } else {
        let closeLine = -1;
        let closeIndex = -1;
        for (let index = lineIndex + 1; index < lines.length; index += 1) {
          const candidate = lines[index] ?? '';
          const close = candidate.indexOf('$$');
          if (close >= 0) {
            closeLine = index;
            closeIndex = close;
            break;
          }
        }
        if (closeLine >= 0) {
          const expression = [
            line.slice(blockStart + 2),
            ...lines.slice(lineIndex + 1, closeLine),
            (lines[closeLine] ?? '').slice(0, closeIndex),
          ]
            .join('\n')
            .trim();
          if (expression !== '') {
            ranges.push({
              from: lineOffset + blockStart,
              to:
                (offsets[closeLine] ?? 0) +
                closeIndex +
                2,
              expression,
              display: true,
            });
          }
          lineIndex = closeLine;
          continue;
        }
        continue;
      }
    }

    // The inline scan uses a masked copy so it cannot match the inner `$` of
    // a display-math delimiter.
    INLINE_MATH.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = INLINE_MATH.exec(inlineSource)) !== null) {
      const rawExpression = match[1];
      const expression = (rawExpression ?? '').trim();
      if (expression === '') continue;
      if (/^\s|\s$/.test(rawExpression ?? '')) continue;
      ranges.push({
        from: lineOffset + match.index,
        to: lineOffset + match.index + match[0].length,
        expression,
        display: false,
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

const buildInlineMathDecorations = (view: EditorView): DecorationSet => {
  const state = view.state;
  const activeLines = activeLineNumbers(state);
  const ranges: Range<Decoration>[] = [];
  for (const range of scanMath(state.doc.toString())) {
    if (range.display) continue;
    if (isActiveLine(state, range.from, activeLines)) continue;
    ranges.push(
      Decoration.replace({
        widget: new MathWidget(range.expression, false),
      }).range(range.from, range.to),
    );
  }
  return Decoration.set(ranges, true);
};

const buildDisplayMathDecorations = (
  state: EditorState,
): DecorationSet => {
  const ranges: Range<Decoration>[] = [];
  for (const range of scanMath(state.doc.toString())) {
    if (!range.display) continue;
    const active = state.selection.ranges.some(
      (selection) =>
        selection.from <= range.to && selection.to >= range.from,
    );
    if (active) continue;
    ranges.push(
      Decoration.replace({
        widget: new MathWidget(range.expression, true),
        block: true,
      }).range(range.from, range.to),
    );
  }
  return Decoration.set(ranges, true);
};

/** Render inline KaTeX spans on inactive lines. */
const inlineMathPreview = (): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildInlineMathDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet) {
          this.decorations = buildInlineMathDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );

/** Inline math (ViewPlugin) + display math (StateField block widgets). */
export const mathPreview = (): Extension => [
  inlineMathPreview(),
  StateField.define<DecorationSet>({
    create: (state) => buildDisplayMathDecorations(state),
    update: (value, transaction) =>
      transaction.docChanged || transaction.selection
        ? buildDisplayMathDecorations(transaction.state)
        : value,
    provide: (field) => EditorView.decorations.from(field),
  }),
];

import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
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

const INLINE_CLASS: Record<string, string> = {
  StrongEmphasis: 'cm-live-strong',
  Emphasis: 'cm-live-em',
  Strikethrough: 'cm-live-strike',
  InlineCode: 'cm-live-inline-code',
};

class TaskWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }

  eq(other: TaskWidget): boolean {
    return (
      other.checked === this.checked &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className = 'cm-live-task';
    input.setAttribute('aria-label', this.checked ? 'Mark task incomplete' : 'Mark task complete');
    input.addEventListener('mousedown', (event) => event.preventDefault());
    input.addEventListener('change', () => {
      view.dispatch({
        changes: {
          from: this.from + 1,
          to: this.from + 2,
          insert: input.checked ? 'x' : ' ',
        },
        userEvent: 'input.complete',
      });
    });
    return input;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class RuleWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const rule = document.createElement('span');
    rule.className = 'cm-live-hr';
    rule.setAttribute('aria-hidden', 'true');
    return rule;
  }
}

const headingClass = (name: string): string | null => {
  const match = /^(?:ATX|Setext)Heading([1-6])$/.exec(name);
  return match === null ? null : `cm-live-h${match[1]}`;
};

const linkHref = (raw: string): string => {
  const match =
    /^\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)$/.exec(raw);
  return match?.[1] ?? '';
};

const buildDecorations = (view: EditorView): DecorationSet => {
  const state = view.state;
  ensureSyntaxTree(state, state.doc.length, 200);
  const activeLines = activeLineNumbers(state);
  const ranges: Range<Decoration>[] = [];
  const lineClasses = new Map<number, Set<string>>();

  const addLineClass = (from: number, to: number, className: string): void => {
    const start = state.doc.lineAt(from).number;
    const end = state.doc.lineAt(to).number;
    for (let line = start; line <= end; line += 1) {
      const lineFrom = state.doc.line(line).from;
      const classes = lineClasses.get(lineFrom) ?? new Set<string>();
      classes.add(className);
      lineClasses.set(lineFrom, classes);
    }
  };

  const hideWhenInactive = (from: number, to: number): void => {
    if (to <= from) return;
    if (!isActiveLine(state, from, activeLines)) {
      ranges.push(Decoration.replace({}).range(from, to));
    }
  };

  const hideMark = (from: number, to: number, swallowSpace = false): void => {
    const trailingSpace =
      swallowSpace && state.doc.sliceString(to, to + 1) === ' ' ? 1 : 0;
    hideWhenInactive(from, to + trailingSpace);
  };

  syntaxTree(state).iterate({
    enter: (node) => {
      const name = node.name;
      const heading = headingClass(name);

      if (heading !== null) {
        addLineClass(node.from, node.to, heading);
        return;
      }
      if (name === 'Blockquote') {
        addLineClass(node.from, node.to, 'cm-live-blockquote');
        return;
      }
      if (name === 'FencedCode') {
        addLineClass(node.from, node.to, 'cm-live-codeblock');
        return;
      }
      if (name === 'ListItem') {
        addLineClass(node.from, node.to, 'cm-live-list-item');
        return;
      }
      if (name === 'Table') {
        addLineClass(node.from, node.to, 'cm-live-table-line');
        return;
      }
      if (name === 'HorizontalRule') {
        if (!isActiveLine(state, node.from, activeLines)) {
          ranges.push(
            Decoration.replace({ widget: new RuleWidget() }).range(
              node.from,
              node.to,
            ),
          );
        }
        return;
      }

      if (name === 'HeaderMark' || name === 'QuoteMark') {
        hideMark(node.from, node.to, true);
        return;
      }
      if (name === 'Escape') {
        hideWhenInactive(node.from, node.to);
        return;
      }
      if (name === 'EmphasisMark' || name === 'StrikethroughMark') {
        hideWhenInactive(node.from, node.to);
        return;
      }
      if (name === 'CodeMark' || name === 'CodeInfo') {
        hideWhenInactive(node.from, node.to);
        return;
      }
      if (name === 'LinkMark' || name === 'URL' || name === 'LinkTitle') {
        hideWhenInactive(node.from, node.to);
        return;
      }
      if (name === 'ListMark') {
        ranges.push(
          Decoration.mark({ class: 'cm-live-list-mark' }).range(
            node.from,
            node.to,
          ),
        );
        return;
      }
      if (name === 'TaskMarker') {
        if (!isActiveLine(state, node.from, activeLines)) {
          const raw = state.doc.sliceString(node.from, node.to);
          const checked = /\[[xX]\]/.test(raw);
          ranges.push(
            Decoration.replace({
              widget: new TaskWidget(checked, node.from, node.to),
            }).range(node.from, node.to),
          );
        }
        return;
      }

      const inline = INLINE_CLASS[name];
      if (inline !== undefined && node.to > node.from) {
        ranges.push(
          Decoration.mark({ class: inline }).range(node.from, node.to),
        );
        return;
      }
      if (name === 'Link') {
        const href = linkHref(state.doc.sliceString(node.from, node.to));
        ranges.push(
          Decoration.mark({
            class: 'cm-live-link',
            attributes: href === '' ? {} : { 'data-href': href, title: href },
          }).range(node.from, node.to),
        );
      }
    },
  });

  for (const [from, classes] of lineClasses) {
    ranges.push(
      Decoration.line({ class: [...classes].join(' ') }).range(from),
    );
  }

  return Decoration.set(ranges, true);
};

/**
 * Inline Markdown live preview.
 *
 * The source text is never mutated. Inactive lines hide their syntax marks
 * through replace decorations; the active line keeps the raw Markdown visible.
 */
export const livePreview = (): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet || update.focusChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );

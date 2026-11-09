import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import {
  StateField,
  type EditorState,
  type Extension,
  type Range,
} from '@codemirror/state';

type Align = 'left' | 'center' | 'right' | null;

export interface ParsedTable {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly align: readonly Align[];
}

const splitRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim().replace(/\\\|/g, '|'));
};

const parseAlign = (cell: string): Align => {
  const trimmed = cell.trim();
  if (!/^:?-{3,}:?$/.test(trimmed)) return null;
  if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
  if (trimmed.startsWith(':')) return 'left';
  if (trimmed.endsWith(':')) return 'right';
  return null;
};

export const parseTable = (raw: string): ParsedTable | null => {
  const lines = raw.trimEnd().split('\n').filter((line) => line.trim() !== '');
  if (lines.length < 2) return null;
  const header = splitRow(lines[0] ?? '');
  const delimiter = splitRow(lines[1] ?? '');
  if (header.length === 0 || delimiter.length !== header.length) return null;
  if (!delimiter.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) {
    return null;
  }
  const align = delimiter.map(parseAlign);
  const rows = lines.slice(2).map((line) => {
    const cells = splitRow(line);
    return header.map((_, index) => cells[index] ?? '');
  });
  return { header, rows, align };
};

class TableWidget extends WidgetType {
  constructor(
    readonly table: ParsedTable,
    readonly raw: string,
    readonly from: number,
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    return other.from === this.from && other.raw === this.raw;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-live-table';
    wrapper.addEventListener('mousedown', (event) => {
      event.preventDefault();
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    });

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const [index, cell] of this.table.header.entries()) {
      const th = document.createElement('th');
      th.textContent = cell;
      const align = this.table.align[index];
      if (align !== null) th.style.textAlign = align;
      headerRow.append(th);
    }
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    for (const row of this.table.rows) {
      const tr = document.createElement('tr');
      for (const [index, cell] of row.entries()) {
        const td = document.createElement('td');
        td.textContent = cell;
        const align = this.table.align[index];
        if (align !== null) td.style.textAlign = align;
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    wrapper.append(table);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const buildTables = (state: EditorState): DecorationSet => {
  ensureSyntaxTree(state, state.doc.length, 200);
  const ranges: Range<Decoration>[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Table') return;
      const active = state.selection.ranges.some(
        (range) => range.from <= node.to && range.to >= node.from,
      );
      if (active) return;
      const raw = state.doc.sliceString(node.from, node.to);
      const parsed = parseTable(raw);
      if (parsed === null) return;
      ranges.push(
        Decoration.replace({
          widget: new TableWidget(parsed, raw, node.from),
          block: true,
        }).range(node.from, node.to),
      );
    },
  });
  return Decoration.set(ranges, true);
};

/** Replace inactive GFM tables with a read-only table widget. */
export const tableWidget = (): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => buildTables(state),
    update: (value, transaction) =>
      transaction.docChanged || transaction.selection
        ? buildTables(transaction.state)
        : value,
    provide: (field) => EditorView.decorations.from(field),
  });

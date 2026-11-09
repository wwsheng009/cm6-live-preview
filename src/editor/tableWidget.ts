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
    readonly to: number,
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    return (
      other.from === this.from &&
      other.to === this.to &&
      other.raw === this.raw
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-live-table';
    const align = [...this.table.align];
    const toolbar = document.createElement('div');
    toolbar.className = 'cm-live-table__toolbar';
    const hint = document.createElement('span');
    hint.textContent = 'Table';
    const source = document.createElement('button');
    source.type = 'button';
    source.className = 'cm-live-table__action';
    source.dataset.action = 'source';
    source.textContent = 'Markdown';
    source.addEventListener('mousedown', (event) => event.preventDefault());
    source.addEventListener('click', () => {
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    });
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'cm-live-table__action cm-live-table__action--primary';
    save.dataset.action = 'save';
    save.textContent = 'Save';
    save.addEventListener('mousedown', (event) => event.preventDefault());
    const addRowButton = document.createElement('button');
    addRowButton.type = 'button';
    addRowButton.className = 'cm-live-table__action';
    addRowButton.dataset.action = 'add-row';
    addRowButton.textContent = '+ Row';
    addRowButton.addEventListener('mousedown', (event) => event.preventDefault());
    const addColumnButton = document.createElement('button');
    addColumnButton.type = 'button';
    addColumnButton.className = 'cm-live-table__action';
    addColumnButton.dataset.action = 'add-column';
    addColumnButton.textContent = '+ Col';
    addColumnButton.addEventListener('mousedown', (event) => event.preventDefault());
    const removeRowButton = document.createElement('button');
    removeRowButton.type = 'button';
    removeRowButton.className = 'cm-live-table__action';
    removeRowButton.dataset.action = 'remove-row';
    removeRowButton.textContent = '- Row';
    const removeColumnButton = document.createElement('button');
    removeColumnButton.type = 'button';
    removeColumnButton.className = 'cm-live-table__action';
    removeColumnButton.dataset.action = 'remove-column';
    removeColumnButton.textContent = '- Col';
    toolbar.append(
      hint,
      source,
      addRowButton,
      addColumnButton,
      removeRowButton,
      removeColumnButton,
      save,
    );
    wrapper.append(toolbar);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const makeCell = (tag: 'th' | 'td', value = ''): HTMLTableCellElement => {
      const cell = document.createElement(tag);
      cell.textContent = value;
      cell.contentEditable = 'true';
      cell.spellcheck = false;
      cell.tabIndex = 0;
      return cell;
    };
    for (const [index, cell] of this.table.header.entries()) {
      const th = makeCell('th', cell);
      const alignment = align[index];
      if (alignment !== null) th.style.textAlign = alignment;
      headerRow.append(th);
    }
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    for (const row of this.table.rows) {
      const tr = document.createElement('tr');
      for (const [index, cell] of row.entries()) {
        const td = makeCell('td', cell);
        const alignment = align[index];
        if (alignment !== null) td.style.textAlign = alignment;
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    wrapper.append(table);

    const cells = (): HTMLTableCellElement[] =>
      [...table.querySelectorAll<HTMLTableCellElement>('th, td')];
    const addRow = (focus: boolean): HTMLTableRowElement => {
      const row = document.createElement('tr');
      for (let index = 0; index < headerRow.children.length; index += 1) {
        const cell = makeCell('td');
        const alignment = align[index];
        if (alignment !== null) cell.style.textAlign = alignment;
        row.append(cell);
      }
      tbody.append(row);
      if (focus) row.querySelector<HTMLTableCellElement>('td')?.focus();
      return row;
    };
    const addColumn = (): void => {
      headerRow.append(makeCell('th'));
      for (const row of tbody.querySelectorAll('tr')) {
        row.append(makeCell('td'));
      }
      align.push(null);
    };
    const removeRow = (): void => {
      if (tbody.querySelectorAll('tr').length <= 1) return;
      tbody.lastElementChild?.remove();
    };
    const removeColumn = (): void => {
      if (headerRow.children.length <= 1) return;
      headerRow.lastElementChild?.remove();
      for (const row of tbody.querySelectorAll('tr')) {
        row.lastElementChild?.remove();
      }
      align.pop();
    };
    addRowButton.addEventListener('click', () => addRow(false));
    addColumnButton.addEventListener('click', () => addColumn());
    removeRowButton.addEventListener('click', removeRow);
    removeColumnButton.addEventListener('click', removeColumn);

    const commit = (): void => {
      const header = [...table.querySelectorAll('thead th')].map(
        (cell) => cell.textContent ?? '',
      );
      const rows = [...table.querySelectorAll('tbody tr')].map((row) =>
        [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? ''),
      );
      const next = serializeTable(header, rows, align);
      if (next === this.raw) return;
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: next },
        userEvent: 'input',
      });
      view.focus();
    };
    save.addEventListener('click', commit);
    wrapper.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        commit();
        return;
      }
      if (event.key === 'Tab') {
        const target = event.target;
        if (!(target instanceof HTMLTableCellElement)) return;
        const allCells = cells();
        const index = allCells.indexOf(target);
        if (index < 0) return;
        event.preventDefault();
        if (event.shiftKey) {
          allCells[Math.max(0, index - 1)]?.focus();
        } else if (index === allCells.length - 1) {
          addRow(true);
        } else {
          allCells[index + 1]?.focus();
        }
      }
    });
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const escapeCell = (value: string): string =>
  value.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const delimiterFor = (align: Align): string => {
  if (align === 'center') return ':---:';
  if (align === 'left') return ':---';
  if (align === 'right') return '---:';
  return '---';
};

export const serializeTable = (
  header: readonly string[],
  rows: readonly (readonly string[])[],
  align: readonly Align[],
): string => {
  const line = (cells: readonly string[]): string =>
    `| ${cells.map(escapeCell).join(' | ')} |`;
  return [
    line(header),
    line(header.map((_, index) => delimiterFor(align[index] ?? null))),
    ...rows.map((row) => line(header.map((_, index) => row[index] ?? ''))),
  ].join('\n');
};

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
          widget: new TableWidget(parsed, raw, node.from, node.to),
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

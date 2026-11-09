import { describe, expect, it } from 'vitest';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Table } from '@lezer/markdown';

import {
  parseTable,
  serializeTable,
  tableWidget,
} from '../tableWidget';

const makeView = (doc: string): EditorView => {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [markdown({ extensions: [Table] }), tableWidget()],
    }),
  });
};

const TABLE = ['| Name | Value |', '| :--- | ---: |', '| A | 1 |', '| B | 2 |'].join('\n');

describe('parseTable', () => {
  it('parses headers, rows, and alignment', () => {
    expect(parseTable(TABLE)).toEqual({
      header: ['Name', 'Value'],
      rows: [
        ['A', '1'],
        ['B', '2'],
      ],
      align: ['left', 'right'],
    });
  });

  it('rejects non-table text', () => {
    expect(parseTable('not a table')).toBeNull();
  });

  it('serializes edited cells and alignment', () => {
    expect(
      serializeTable(
        ['Name', 'Value'],
        [['A|B', '1\n2']],
        ['left', 'right'],
      ),
    ).toBe('| Name | Value |\n| :--- | ---: |\n| A\\|B | 1 2 |');
  });
});

describe('tableWidget', () => {
  it('renders an editable table when the selection is outside it', () => {
    const view = makeView(`${TABLE}\n\nAfter`);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(view.contentDOM.querySelector('.cm-live-table table')).not.toBeNull();
    expect(
      view.contentDOM.querySelector('.cm-live-table th')?.textContent,
    ).toBe('Name');
    view.destroy();
  });

  it('saves cell edits back to Markdown', () => {
    const view = makeView(`${TABLE}\n\nAfter`);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const header = view.contentDOM.querySelector(
      '.cm-live-table thead th',
    );
    if (header === null) throw new Error('table header not rendered');
    header.textContent = 'Updated';
    view.contentDOM
      .querySelector<HTMLButtonElement>('[data-action="save"]')
      ?.click();
    expect(view.state.doc.toString()).toContain('| Updated | Value |');
    view.destroy();
  });

  it('switches table widget back to Markdown source', () => {
    const view = makeView(`${TABLE}\n\nAfter`);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    view.contentDOM
      .querySelector<HTMLButtonElement>('[data-action="source"]')
      ?.click();
    expect(view.contentDOM.querySelector('.cm-live-table')).toBeNull();
    expect(view.contentDOM.textContent).toContain('| Name | Value |');
    view.destroy();
  });

  it('moves focus with Tab and appends a row at the end', () => {
    const view = makeView(`${TABLE}\n\nAfter`);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const cells = [
      ...view.contentDOM.querySelectorAll<HTMLTableCellElement>('th, td'),
    ];
    cells[0]?.focus();
    cells[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(cells[1]);

    cells[cells.length - 1]?.focus();
    cells[cells.length - 1]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(
      view.contentDOM.querySelectorAll('.cm-live-table tbody tr'),
    ).toHaveLength(3);
    view.destroy();
  });

  it('adds a column and row before saving', () => {
    const view = makeView(`${TABLE}\n\nAfter`);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    view.contentDOM
      .querySelector<HTMLButtonElement>('[data-action="add-column"]')
      ?.click();
    view.contentDOM
      .querySelector<HTMLButtonElement>('[data-action="add-row"]')
      ?.click();
    view.contentDOM
      .querySelector<HTMLButtonElement>('[data-action="save"]')
      ?.click();
    expect(view.state.doc.toString()).toContain(
      '| Name | Value |  |\n| :--- | ---: | --- |',
    );
    expect(view.state.doc.toString()).toContain('| A | 1 |  |');
    view.destroy();
  });

  it('keeps the source visible when the selection enters the table', () => {
    const view = makeView(TABLE);
    view.dispatch({ selection: { anchor: 1 } });
    expect(view.contentDOM.querySelector('.cm-live-table')).toBeNull();
    expect(view.contentDOM.textContent).toContain('| Name |');
    view.destroy();
  });
});

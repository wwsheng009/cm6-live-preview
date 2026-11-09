import { describe, expect, it } from 'vitest';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Table } from '@lezer/markdown';

import { parseTable, tableWidget } from '../tableWidget';

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
});

describe('tableWidget', () => {
  it('renders a read-only table when the selection is outside it', () => {
    const view = makeView(`${TABLE}\n\nAfter`);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(view.contentDOM.querySelector('.cm-live-table table')).not.toBeNull();
    expect(
      view.contentDOM.querySelector('.cm-live-table th')?.textContent,
    ).toBe('Name');
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

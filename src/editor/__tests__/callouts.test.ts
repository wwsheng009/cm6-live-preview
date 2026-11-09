import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { callouts, scanCallouts } from '../callouts';

describe('scanCallouts', () => {
  it('finds a callout and its quote body', () => {
    const source = '> [!note] Title\n> body\n\nAfter';
    expect(scanCallouts(source)).toEqual([
      { from: 0, to: 22, type: 'note', title: 'Title' },
    ]);
  });
});

describe('callouts', () => {
  it('adds callout line classes', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: '> [!warning] Watch out\n> body',
        extensions: [callouts()],
      }),
    });
    expect(
      view.contentDOM.querySelector('.cm-live-callout--warning'),
    ).not.toBeNull();
    view.destroy();
  });
});

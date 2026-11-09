import { describe, expect, it } from 'vitest';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { mathPreview, scanMath } from '../math';

const makeView = (doc: string): EditorView => {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [markdown(), mathPreview()],
    }),
  });
};

describe('scanMath', () => {
  it('finds inline and display math outside code', () => {
    expect(scanMath('A $x^2$ and $$y$$')).toEqual([
      { from: 2, to: 7, expression: 'x^2', display: false },
      { from: 12, to: 17, expression: 'y', display: true },
    ]);
    const fenced = '```\n$x$\n```\n`$y$`';
    expect(scanMath(fenced)).toEqual([]);
  });

  it('finds multi-line display math', () => {
    expect(scanMath('Before\n$$\na + b\n$$\nAfter')).toEqual([
      {
        from: 7,
        to: 18,
        expression: 'a + b',
        display: true,
      },
    ]);
  });
});

describe('mathPreview', () => {
  it('renders KaTeX when the line is inactive', () => {
    const view = makeView('Inline $x^2$\n\nCursor here');
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(view.contentDOM.querySelector('.cm-live-math .katex')).not.toBeNull();
    view.destroy();
  });

  it('renders multi-line display math as a block', () => {
    const view = makeView('Before\n$$\na + b\n$$\nAfter');
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(
      view.contentDOM.querySelector('.cm-live-math--block .katex-display'),
    ).not.toBeNull();
    view.destroy();
  });
});

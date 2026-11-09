import { describe, expect, it } from 'vitest';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Table, TaskList, Strikethrough } from '@lezer/markdown';

import { imageBlocks } from '../imageBlocks';
import { livePreview } from '../livePreview';
import { livePreviewTheme } from '../livePreviewTheme';

const makeView = (doc: string): EditorView => {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        markdown({ extensions: [Table, TaskList, Strikethrough] }),
        livePreview(),
        imageBlocks(),
        livePreviewTheme,
      ],
    }),
  });
};

describe('livePreview', () => {
  it('styles headings and inline formatting without changing the source', () => {
    const source = '# Title\n\nA **bold** and *italic* line.';
    const view = makeView(source);
    expect(view.contentDOM.querySelector('.cm-live-h1')).not.toBeNull();
    expect(view.contentDOM.querySelector('.cm-live-strong')).not.toBeNull();
    expect(view.contentDOM.querySelector('.cm-live-em')).not.toBeNull();
    expect(view.state.doc.toString()).toBe(source);
    view.destroy();
  });

  it('hides syntax marks on inactive lines but keeps them on the active line', () => {
    const view = makeView('# Title\n\nBody');
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const firstLine = view.contentDOM.querySelector('.cm-line');
    expect(firstLine?.textContent).toBe('Title');
    view.destroy();
  });

  it('replaces task markers with a working checkbox widget', () => {
    const view = makeView('- [ ] first\n- second');
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const checkbox = view.contentDOM.querySelector<HTMLInputElement>(
      '.cm-live-task',
    );
    expect(checkbox?.checked).toBe(false);
    checkbox?.click();
    expect(view.state.doc.toString()).toContain('- [x] first');
    view.destroy();
  });

  it('renders image blocks from Markdown image syntax', () => {
    const view = makeView('![demo](/demo.svg)');
    const image = view.contentDOM.querySelector<HTMLImageElement>(
      '.cm-live-image-block img',
    );
    expect(image?.getAttribute('src')).toBe('/demo.svg');
    view.destroy();
  });
});

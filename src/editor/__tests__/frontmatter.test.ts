import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { frontmatterField, parseFrontmatter } from '../frontmatter';

const DOC = '---\ntitle: Demo\nstatus: prototype\n---\n\nBody';

describe('parseFrontmatter', () => {
  it('parses a leading block and simple key/value entries', () => {
    expect(parseFrontmatter(DOC)).toEqual({
      from: 0,
      to: 37,
      entries: [
        { key: 'title', value: 'Demo' },
        { key: 'status', value: 'prototype' },
      ],
    });
    expect(parseFrontmatter('Body')).toBeNull();
  });
});

describe('frontmatterField', () => {
  it('renders a properties card when the selection is outside', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: DOC,
        extensions: [frontmatterField()],
      }),
    });
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(view.contentDOM.querySelector('.cm-live-frontmatter')).not.toBeNull();
    expect(
      view.contentDOM.querySelector('.cm-live-frontmatter__key')?.textContent,
    ).toBe('title');
    view.destroy();
  });

  it('shows raw source when the selection is inside', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: DOC,
        extensions: [frontmatterField()],
      }),
    });
    view.dispatch({ selection: { anchor: 1 } });
    expect(view.contentDOM.querySelector('.cm-live-frontmatter')).toBeNull();
    expect(view.contentDOM.textContent).toContain('title: Demo');
    view.destroy();
  });
});

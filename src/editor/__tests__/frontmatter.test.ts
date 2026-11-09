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

  it('saves edited property values back to YAML', () => {
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
    const value = view.contentDOM.querySelector(
      '.cm-live-frontmatter__value',
    );
    if (value === null) throw new Error('frontmatter value not rendered');
    value.textContent = 'Updated';
    view.contentDOM
      .querySelector<HTMLButtonElement>('.cm-live-frontmatter__action--primary')
      ?.click();
    expect(view.state.doc.toString()).toContain('title: Updated');
    view.destroy();
  });
});

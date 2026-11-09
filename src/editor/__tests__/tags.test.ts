import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { inlineTags, scanTags } from '../tags';

describe('scanTags', () => {
  it('finds tags but ignores headings and code', () => {
    expect(scanTags('# Heading\nA #cm6 and #markdown')).toEqual([
      { from: 12, to: 16, tag: 'cm6' },
      { from: 21, to: 30, tag: 'markdown' },
    ]);
    expect(scanTags('```\n#inside\n```\n`#inline`')).toEqual([]);
  });
});

describe('inlineTags', () => {
  it('renders tags and opens them with Ctrl+click', () => {
    let opened = '';
    const parent = document.createElement('div');
    document.body.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: 'A #cm6 tag',
        extensions: [inlineTags({ onOpen: (tag) => (opened = tag) })],
      }),
    });
    const tag = view.contentDOM.querySelector<HTMLElement>('.cm-live-tag');
    expect(tag?.dataset.tag).toBe('cm6');
    tag?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    expect(opened).toBe('cm6');
    view.destroy();
  });
});

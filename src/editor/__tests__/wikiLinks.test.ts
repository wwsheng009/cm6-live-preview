import { describe, expect, it } from 'vitest';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import {
  scanWikiLinks,
  wikiLinkBaseTarget,
  wikiLinkCompletionOptions,
  wikiLinks,
} from '../wikiLinks';

const makeView = (
  doc: string,
  onOpen: (target: string) => void = () => undefined,
): EditorView => {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [markdown(), wikiLinks({ onOpen })],
    }),
  });
};

describe('scanWikiLinks', () => {
  it('finds target and alias ranges', () => {
    expect(scanWikiLinks('前[[项目|别名]]后')).toEqual([
      {
        from: 1,
        to: 10,
        target: '项目',
        alias: '别名',
        embedded: false,
      },
    ]);
  });

  it('recognizes embed syntax', () => {
    expect(scanWikiLinks('![[项目]]')).toEqual([
      {
        from: 0,
        to: 7,
        target: '项目',
        alias: '',
        embedded: true,
      },
    ]);
  });

  it('skips code fences and inline code', () => {
    const source = [
      '[[可见]]',
      '```',
      '[[代码]]',
      '```',
      '`[[行内]]`',
      '[[也可见]]',
    ].join('\n');
    expect(scanWikiLinks(source).map((range) => range.target)).toEqual([
      '可见',
      '也可见',
    ]);
  });
});

describe('wikiLinkCompletionOptions', () => {
  it('prioritizes prefixes and removes duplicates', () => {
    expect(
      wikiLinkCompletionOptions('项目', ['项目笔记', '我的项目', '项目笔记']),
    ).toMatchObject([
      { label: '项目笔记', apply: '[[项目笔记]]' },
      { label: '我的项目', apply: '[[我的项目]]' },
    ]);
  });
});

describe('wikiLinkBaseTarget', () => {
  it('drops heading and block fragments', () => {
    expect(wikiLinkBaseTarget('项目#风险')).toBe('项目');
    expect(wikiLinkBaseTarget('项目^block')).toBe('项目');
  });
});

describe('wikiLinks', () => {
  it('renders wiki links as decorations and opens with Ctrl+click', () => {
    let opened = '';
    const view = makeView('[[项目笔记]]', (target) => {
      opened = target;
    });
    const link = view.contentDOM.querySelector<HTMLElement>(
      '.cm-live-wikilink',
    );
    expect(link?.dataset.wikilinkTarget).toBe('项目笔记');

    link?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    expect(opened).toBe('项目笔记');
    view.destroy();
  });

  it('styles embeds distinctly', () => {
    const view = makeView('![[项目笔记]]');
    expect(view.contentDOM.querySelector('.cm-live-embed')).not.toBeNull();
    expect(
      view.contentDOM.querySelector<HTMLElement>('.cm-live-embed')
        ?.dataset.wikilinkEmbed,
    ).toBe('true');
    view.destroy();
  });

  it('marks unresolved targets when a resolver says so', () => {
    const view = makeView('[[缺失]]');
    const resolved = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: '[[缺失]]',
        extensions: [
          markdown(),
          wikiLinks({ isResolved: () => false }),
        ],
      }),
    });
    expect(resolved.contentDOM.querySelector('.cm-live-wikilink--unresolved')).not.toBeNull();
    view.destroy();
    resolved.destroy();
  });

  it('resolves using the base target for anchored links', () => {
    const view = makeView('[[项目#风险]]');
    const anchored = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: '[[项目#风险]]',
        extensions: [
          markdown(),
          wikiLinks({ isResolved: (target) => target === '项目' }),
        ],
      }),
    });
    expect(
      anchored.contentDOM.querySelector('.cm-live-wikilink--unresolved'),
    ).toBeNull();
    view.destroy();
    anchored.destroy();
  });
});

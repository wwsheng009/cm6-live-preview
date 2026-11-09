import { useMemo, useRef, useState } from 'react';

import {
  LivePreviewEditor,
  type LivePreviewEditorHandle,
  type EditorMode,
} from './editor/LivePreviewEditor';

const SAMPLE = `# CM6 Live Preview Lab

这是一个**从零实现**的 CodeMirror 6 Markdown Live Preview 实验。
源文本始终是 Markdown；这里看到的样式全部来自 decoration。

## 行内格式

支持 **粗体**、*斜体*、~~删除线~~、\`inline code\`，以及 [外部链接](https://codemirror.net/)。

数学公式：$E = mc^2$，以及块级公式：

$$\int_0^1 x^2 dx = \frac{1}{3}$$

## 任务与列表

- [ ] 完成 inline preview decoration
- [x] 建立独立 CM6 编辑器
- [ ] 接入可编辑表格

- 普通列表项
- 另一个列表项

> Live Preview 的关键不是“替换成 HTML”，而是让 Markdown 文本仍然可编辑。

## Wiki links

- [[项目笔记]]
- [[Project Notes|项目笔记]]
- [[缺失笔记]]

## 图片

![CM6 Live Preview](/demo.svg)

## 代码

\`\`\`ts
const mode: 'live' | 'source' = 'live';
console.log('raw markdown remains the source of truth');
\`\`\`

## 表格

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| inline preview | ✅ | 当前行显示 Markdown 标记 |
| task widget | ✅ | checkbox 可直接切换 |
| wikilink | ✅ | 支持补全与点击回调 |
| table widget | ✅ | 光标离开后渲染为只读表格 |
`;

const WIKI_TITLES = ['项目笔记', 'Project Notes', '设计文档', 'CM6 研究'];

export function App(): JSX.Element {
  const editorRef = useRef<LivePreviewEditorHandle | null>(null);
  const [markdown, setMarkdown] = useState(SAMPLE);
  const [mode, setMode] = useState<EditorMode>('live');
  const [readOnly, setReadOnly] = useState(false);
  const [lastAction, setLastAction] = useState('Ready');

  const stats = useMemo(() => {
    const lines = markdown === '' ? 0 : markdown.split('\n').length;
    return { lines, chars: [...markdown].length };
  }, [markdown]);

  const resolvedTitles = useMemo(() => new Set(WIKI_TITLES), []);

  return (
    <div className="lab-shell">
      <header className="lab-topbar">
        <div>
          <p className="lab-eyebrow">ITSM / Editor Lab</p>
          <h1>CM6 Live Preview</h1>
        </div>
        <div className="lab-topbar__meta">
          <span>{stats.lines} lines</span>
          <span>{stats.chars} chars</span>
          <span className="lab-badge">raw Markdown</span>
        </div>
      </header>

      <div className="lab-toolbar" role="toolbar" aria-label="Editor controls">
        <div className="lab-segmented">
          <button
            type="button"
            className={mode === 'live' ? 'is-active' : ''}
            aria-pressed={mode === 'live'}
            onClick={() => setMode('live')}
          >
            Live Preview
          </button>
          <button
            type="button"
            className={mode === 'source' ? 'is-active' : ''}
            aria-pressed={mode === 'source'}
            onClick={() => setMode('source')}
          >
            Source
          </button>
        </div>
        <label className="lab-check">
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />
          Read only
        </label>
        <button
          type="button"
          className="lab-button"
          onClick={() => {
            setMarkdown(SAMPLE);
            setLastAction('Sample restored');
            editorRef.current?.focus();
          }}
        >
          Reset sample
        </button>
        <span className="lab-action" aria-live="polite">
          {lastAction}
        </span>
      </div>

      <main className="lab-workbench">
        <section className="lab-editor-panel" aria-label="Markdown editor">
          <LivePreviewEditor
            ref={editorRef}
            value={markdown}
            onChange={setMarkdown}
            mode={mode}
            readOnly={readOnly}
            wikiSuggestions={WIKI_TITLES}
            isWikiLinkResolved={(target) => resolvedTitles.has(target)}
            onOpenWikiLink={(target) => {
              setLastAction(`Open wiki link: ${target}`);
            }}
            onOpenLink={(href) => {
              setLastAction(`Open external link: ${href}`);
              if (href.startsWith('http')) {
                window.open(href, '_blank', 'noopener,noreferrer');
              }
            }}
            ariaLabel="CM6 Markdown live preview editor"
          />
        </section>

        <aside className="lab-info">
          <div className="lab-info__card">
            <p className="lab-info__label">Design rule</p>
            <strong>Markdown is the model.</strong>
            <p>
              Decorations are view-only. Saving the document always writes the
              raw Markdown below, never a rendered HTML tree.
            </p>
          </div>
          <div className="lab-info__card">
            <p className="lab-info__label">Try this</p>
            <ul>
              <li>Put the cursor on a heading to reveal its `#`.</li>
              <li>Click a task checkbox.</li>
              <li>Type `[[` and pick a note title.</li>
              <li>Ctrl/Cmd+click a link or wikilink.</li>
            </ul>
          </div>
          <div className="lab-info__card lab-info__card--muted">
            <p className="lab-info__label">Scope</p>
            <p>
              MVP intentionally leaves HTML, MDX, embeds and WYSIWYG tables out.
              Those are separate milestones.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

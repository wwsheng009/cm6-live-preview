# Feature Matrix

## 已完成

| 能力 | 实现方式 | 验证 |
|---|---|---|
| 标题 | line decoration | `livePreview.test.ts` |
| 粗体/斜体/删除线/行内代码 | mark decoration | `livePreview.test.ts` |
| Markdown 标记隐藏 | replace decoration | `livePreview.test.ts` |
| 当前行显示标记 | selection → active lines | `livePreview.test.ts` |
| task checkbox | widget + transaction | `livePreview.test.ts` |
| 图片预览 | StateField + block widget | `livePreview.test.ts` |
| 水平线 | replace widget | 手工验证 |
| wikilink | mark + DOM handler | `wikiLinks.test.ts` |
| `[[` 补全 | language data + autocomplete | 手工验证 |
| 外链点击 | DOM handler | 手工验证 |
| Live/Source 切换 | Compartment | `LivePreviewEditor.test.tsx` |
| read-only | Compartment | `LivePreviewEditor.test.tsx` |
| controlled value | external transaction guard | `LivePreviewEditor.test.tsx` |

## 部分完成

| 能力 | 现状 | 下一步 |
|---|---|---|
| 代码块 | 行类样式 | 语法高亮、复制按钮 |
| 列表 | 保留 Markdown 标记 + 行类 | bullet/ordered 视觉替换 |
| 表格 | 保留 Markdown 文本 | 只读 table widget → 单元格编辑 |
| wikilink | 同步 resolver | 异步 target 解析和 hover |
| 图片 | 同步 src | 异步 asset resolver、错误占位 |
| 主题 | CSS 变量 + CM6 theme | 与主产品 token 对齐 |

## 计划中

- WYSIWYG table widget
- KaTeX inline/block math
- callout / admonition
- embed `![[...]]`
- block reference `^id`
- frontmatter / properties
- inline tags
- hover preview
- code block syntax highlighting
- dynamic plugin extensions
- large document performance benchmark
- IME / iOS / Android 兼容性测试

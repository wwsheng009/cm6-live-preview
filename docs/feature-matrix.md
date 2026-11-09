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
| 异步图片 resolver | widget 内部 Promise 更新 | `LivePreviewEditor.test.tsx` |
| 水平线 | replace widget | 手工验证 |
| 只读表格 | StateField + replace block widget | `tableWidget.test.ts` |
| KaTeX 数学 | replace widget | `math.test.ts` |
| fenced code 高亮 | markdown codeLanguages + 动态 import | `pnpm build` |
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
| 表格 | 只读 widget | 单元格编辑、Tab 导航、增删行列 |
| 数学 | 单行 `$...$` / `$$...$$` | 多行块公式、公式编辑面板 |
| 图片 | 异步 resolver + 错误占位 | 附件桥、blob 生命周期 |
| 主题 | CSS 变量 + CM6 theme | 与主产品 token 对齐 |

## 计划中

- 可编辑 table widget
- 多行 block math
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

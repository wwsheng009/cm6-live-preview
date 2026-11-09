# ITSM Editor Lab · CM6 Live Preview

一个**从零实现**的 CodeMirror 6 Markdown Live Preview 实验项目。

目标不是直接依赖某个现成编辑器，而是验证：

- Markdown 是否能继续作为唯一数据源
- 能否用 CM6 decoration 实现 Obsidian 风格的行内预览
- 图片、任务、wikilink 等交互能否在纯 Markdown 文本上完成
- 未来是否可以替换当前产品中的 TipTap 可视化编辑面

## 设计原则

1. **Markdown 是模型**
   - `EditorState.doc` 始终保存原始 Markdown
   - 所有预览都是 view-only decoration
   - 保存、复制、比较、外部编辑器打开都不需要 HTML 序列化

2. **不直接引用参考项目的代码**
   - 运行时只依赖官方 CodeMirror 6、Lezer 和 React
   - 不依赖 `atomic-editor`、`codemirror-live-markdown`、`ink-mde`、SilverBullet
   - 参考项目只用于行为研究和功能对照

3. **当前行可编辑**
   - 光标所在的 Markdown 行显示原始标记
   - 离开后隐藏 `#`、`**`、`~~`、`` ` `` 等语法标记

4. **布局稳定**
   - 行内 decoration 只改变显示，不改变文档内容
   - 当前实现避免整块替换之后的布局抖动

## 已实现

- 标题 `#` ~ `######` 的行类样式
- 粗体、斜体、删除线、行内代码
- 代码围栏样式（暂不引入代码高亮）
- 引用块
- 无序列表标记样式
- task list checkbox widget，可直接切换 `[ ]` / `[x]`
- `[text](url)` 链接样式和 Ctrl/Cmd+点击回调
- `[[target]]` / `[[target|alias]]` wikilink
- `[[` 标题自动补全
- wikilink 未解析样式
- Markdown 图片 block widget
- 异步图片资产 resolver、加载/失败占位
- 水平线 widget
- GFM 表格可编辑 widget（单元格编辑、Tab 导航、行列增删、Save/Markdown 切换）
- KaTeX 行内/多行块级公式
- 常用 fenced code 语言高亮（JS/TS/TSX/Python/HTML/CSS/JSON，按需加载）
- `#tag` 行内标签样式和点击回调
- Obsidian 风格 blockquote callout（note/tip/warning/danger 等）
- frontmatter properties card（字段编辑、Save/Markdown 切换）
- `![[embed]]` 识别、样式和点击回调
- wikilink/embed hover preview（由宿主 `wikiPreview` 回调提供内容）
- Live Preview / Source 模式切换
- read-only 模式
- 宿主自定义 CM6 extension 注入
- 受控 `value` / `onChange`
- Vitest + jsdom 测试

## 尚未实现

- 表格逐单元格事务、公式和复杂单元格 Markdown
- embed 内容渲染（当前只识别和样式化）
- block reference 跳转
- properties 类型选择和 tag 面板
- embed hover 的内容编辑和引用更新
- 更多代码语言和代码复制按钮
- 附件桥和 blob/data URL 生命周期管理
- MDX / HTML
- Obsidian `registerEditorExtension` 兼容层
- 大规模文档基准测试

完整矩阵见 [`docs/feature-matrix.md`](./docs/feature-matrix.md)。

## 快速开始

```bash
corepack pnpm install
corepack pnpm dev
```

打开 Vite 输出的地址即可。

## 验证

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## 目录

```text
src/
  editor/
    LivePreviewEditor.tsx   React 外壳 + controlled value
    livePreview.ts          行内 Markdown decoration
    imageBlocks.ts          StateField 图片 block widget
    wikiLinks.ts            wikilink 装饰、点击、补全
    linkClicks.ts           外链点击
    livePreviewTheme.ts     CM6 主题
    core/
      setup.ts              核心编辑能力
      syntax.ts             选区/行辅助函数
  test/
    setup.ts                jsdom Range 兼容
docs/
  architecture.md
  feature-matrix.md
  reference-research.md
```

## 下一步

1. 增加附件桥和更完整的图片生命周期管理
2. 表格逐单元格事务、复杂单元格内容和组合编辑
3. 接入 embed 内容渲染、block ref 跳转和 hover preview
4. 完善 properties 编辑和插件 extension 接口
5. 用真实笔记做 IME、撤销、滚动和大文档基准测试

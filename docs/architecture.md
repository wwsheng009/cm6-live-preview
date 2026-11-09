# Architecture

## 1. 总体模型

```text
React props
  ↓
LivePreviewEditor
  ↓
CodeMirror 6 EditorView
  ├── Markdown parser
  ├── coreSetup
  ├── livePreview()        ViewPlugin / inline decorations
  ├── mathPreview()        ViewPlugin / KaTeX widgets
  ├── tableWidget()        StateField / read-only table widgets
  ├── imageBlocks()        StateField / block widgets
  ├── wikiLinks()          ViewPlugin + DOM events + autocomplete
  ├── frontmatterField()   StateField / properties card
  ├── callouts()           line decorations
  ├── inlineTags()         mark decorations + click
  ├── markdown codeLanguages
  ├── host extensions      Compartment
  └── livePreviewTheme
```

编辑器没有中间富文本模型。`state.doc` 是唯一的文档来源。

## 2. 为什么行内预览放在 ViewPlugin

`livePreview()` 只产生行类和行内 decoration：

- `Decoration.line`：标题、引用、代码块等块级视觉样式
- `Decoration.mark`：粗体、斜体、链接、wikilink
- `Decoration.replace`：隐藏非活动行的 Markdown 标记
- `Decoration.replace({ widget })`：checkbox、水平线

这些 decoration 基于选区重建：

- 光标进入某行后，该行重新显示 Markdown 标记
- 光标离开后，标记再次隐藏

当前实现每次 `docChanged` / `selectionSet` / `focusChanged` 重建整个文档 decoration。它是 MVP 实现，不是最终性能方案。下一阶段应做：

- 只重建受影响的 changeline
- `syntaxTree` 增量解析
- selection 变化时只更新与 selection 相交的 mark

## 3. 为什么图片使用 StateField

CodeMirror 6 的 block widget 不能由普通 ViewPlugin 提供，因此图片预览单独使用 `StateField`：

- 遍历语法树中的 `Image` 节点
- 在图片源码所在行之后插入 block widget
- 只有文档发生变化时才重建

图片目前在同步阶段解析 `![alt](src)`。后续可改成：

- 解析 Markdown image destination
- 交给宿主注入的 asset resolver
- 异步加载后通过 StateEffect 更新 widget
- 失败时显示占位与错误信息

当前已经支持 `resolveSrc` 返回 `string | Promise<string>`，异步完成后在 widget 内部替换为 `<img>`；失败时显示错误占位。

## 3.1 代码高亮和数学

- fenced code 由 `markdown({ codeLanguages })` 加载语言 grammar
- JS/TS/TSX、Python、HTML、CSS、JSON 使用动态 import
- KaTeX 使用单行 `$...$` / `$$...$$` 扫描；光标进入对应行时显示源码
- 多行块级公式、公式编辑面板仍是后续工作

## 3.2 表格

当前表格实现是可编辑 widget：

- 选区在表格外时，整张 GFM 表格替换为可编辑 `<table>`
- 选区进入表格时，重新显示原始 Markdown
- 单元格使用 `contenteditable`，Save 按钮或 Ctrl/Cmd+Enter 提交
- Markdown 按钮把选区移到表格起点，显示源码

Tab 导航、行列操作和单元格内复杂 Markdown 尚未实现。

## 4. 为什么 wikilink 单独实现

标准 Markdown 解析器不认识 `[[target]]`，因此 wikilink 使用独立扫描器：

- 跳过 fenced code block 和行内代码
- 用 `Decoration.mark` 表示链接范围
- 用 `EditorView.domEventHandlers` 处理 Ctrl/Cmd+点击
- 用 language data 注册 `[[` 补全源

这保持了与 Markdown 解析器的解耦，也方便以后接入笔记目录和异步解析器。

## 4.1 标签、callout 和 frontmatter

- `inlineTags()` 扫描 `#tag`，跳过标题和代码
- `callouts()` 扫描 `> [!note]` 及其后续引用行
- `frontmatterField()` 在选区离开时把 YAML 头替换为只读 properties card
- `![[embed]]` 与普通 wikilink 共用扫描器，但使用独立样式和 `data-wikilink-embed`
- `hoverTooltip` 根据宿主 `wikiPreview` 回调显示同步或异步内容
- heading/block anchor 在解析时会被剥离，但点击回调仍保留完整 target

这些能力都只修改 view 层，不改变原始 Markdown。

## 5. 模式切换

`LivePreviewEditor` 使用四个 Compartment：

- `livePreviewCompartment`：在 `livePreview()` 与 `[]` 之间切换
- `lineNumbersCompartment`：source 模式显示行号
- `editableCompartment`：read-only 切换
- `extensionsCompartment`：宿主 CM6 extension 注入

因此切换模式不会销毁 EditorView，也不会丢失文档、撤销栈和滚动位置。

## 6. 当前边界

- 表格保留 Markdown 源文本，未做 WYSIWYG table widget
- 表格编辑是整表提交，不是逐单元格事务
- 块级数学公式仅支持单行
- 没有自定义 Markdown parser extension 处理 `[[]]`
- 还没有附件桥和 blob/data URL 生命周期管理
- 没有 Obsidian 插件 extension 兼容层
- 还没有性能基准

这些是后续里程碑，不应和第一版 MVP 混在一起。

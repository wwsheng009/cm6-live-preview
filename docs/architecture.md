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
  ├── imageBlocks()        StateField / block widgets
  ├── wikiLinks()          ViewPlugin + DOM events + autocomplete
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

## 4. 为什么 wikilink 单独实现

标准 Markdown 解析器不认识 `[[target]]`，因此 wikilink 使用独立扫描器：

- 跳过 fenced code block 和行内代码
- 用 `Decoration.mark` 表示链接范围
- 用 `EditorView.domEventHandlers` 处理 Ctrl/Cmd+点击
- 用 language data 注册 `[[` 补全源

这保持了与 Markdown 解析器的解耦，也方便以后接入笔记目录和异步解析器。

## 5. 模式切换

`LivePreviewEditor` 使用三个 Compartment：

- `livePreviewCompartment`：在 `livePreview()` 与 `[]` 之间切换
- `lineNumbersCompartment`：source 模式显示行号
- `editableCompartment`：read-only 切换

因此切换模式不会销毁 EditorView，也不会丢失文档、撤销栈和滚动位置。

## 6. 当前边界

- 表格保留 Markdown 源文本，未做 WYSIWYG table widget
- 没有自定义 Markdown parser extension 处理 `[[]]`
- 没有异步资产 resolver
- 没有 Obsidian 插件 extension 兼容层
- 还没有性能基准

这些是后续里程碑，不应和第一版 MVP 混在一起。

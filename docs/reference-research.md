# Reference Research

本项目在功能设计阶段调研了以下公开项目：

- [atomic-editor](https://github.com/kenforthewin/atomic-editor)
- [codemirror-live-markdown](https://github.com/blueberrycongee/codemirror-live-markdown)
- [codemirror-markdown-hybrid](https://github.com/markdowneditors/codemirror-markdown-hybrid)
- [ink-mde](https://github.com/davidmyersdev/ink-mde)
- [SilverBullet](https://github.com/silverbulletmd/silverbullet)

## 使用边界

- 这些项目**不作为运行时依赖**
- 没有复制它们的源码
- 没有复制它们的 CSS、主题、测试或项目结构
- 仅参考公开的行为模式：
  - Markdown 文本 + view-only decoration
  - 当前行显示语法标记
  - block widget 使用 StateField
  - 图片/表格/代码块的交互边界
  - 大量小模块而不是单一巨型插件

## 调研结论

最接近 Obsidian Live Preview 行为的是 `atomic-editor`。

最适合作为 CM6 extension 设计参考的是 `codemirror-live-markdown`。

SilverBullet 更适合参考大型 CM6 Markdown 编辑器的模块划分，而不是作为库集成。

本项目的实现只依赖官方 CodeMirror 6 / Lezer / React API。

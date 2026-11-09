import { EditorView } from '@codemirror/view';

export const livePreviewTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--lab-editor-bg)',
    color: 'var(--lab-editor-fg)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--lab-font-ui)',
    fontSize: '16px',
    lineHeight: '1.75',
  },
  '.cm-content': {
    maxWidth: '860px',
    minHeight: '100%',
    margin: '0 auto',
    padding: '40px 56px 120px',
    caretColor: 'var(--lab-accent)',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-gutters': {
    borderRight: '1px solid var(--lab-border)',
    backgroundColor: 'var(--lab-editor-bg)',
    color: 'var(--lab-fg-subtle)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--lab-selection)',
  },
  '.cm-live-h1': {
    paddingTop: '0.5em',
    fontSize: '2em',
    fontWeight: '700',
    lineHeight: '1.25',
  },
  '.cm-live-h2': {
    paddingTop: '0.45em',
    fontSize: '1.55em',
    fontWeight: '650',
    lineHeight: '1.35',
  },
  '.cm-live-h3': {
    paddingTop: '0.35em',
    fontSize: '1.3em',
    fontWeight: '650',
  },
  '.cm-live-h4, .cm-live-h5, .cm-live-h6': {
    fontWeight: '650',
  },
  '.cm-live-strong': {
    fontWeight: '700',
  },
  '.cm-live-em': {
    fontStyle: 'italic',
  },
  '.cm-live-strike': {
    color: 'var(--lab-fg-subtle)',
    textDecoration: 'line-through',
  },
  '.cm-live-inline-code': {
    padding: '0.1em 0.35em',
    borderRadius: '4px',
    backgroundColor: 'var(--lab-code-bg)',
    color: 'var(--lab-code-fg)',
    fontFamily: 'var(--lab-font-mono)',
    fontSize: '0.9em',
  },
  '.cm-live-link': {
    color: 'var(--lab-link)',
    textDecoration: 'underline',
    textDecorationColor: 'color-mix(in srgb, var(--lab-link) 45%, transparent)',
    textUnderlineOffset: '2px',
    cursor: 'pointer',
  },
  '.cm-live-wikilink': {
    padding: '0 0.2em',
    borderRadius: '4px',
    backgroundColor: 'color-mix(in srgb, var(--lab-accent) 9%, transparent)',
    color: 'var(--lab-accent)',
    cursor: 'pointer',
  },
  '.cm-live-wikilink--unresolved': {
    backgroundColor: 'var(--lab-code-bg)',
    color: 'var(--lab-fg-subtle)',
    textDecoration: 'line-through',
    textDecorationColor: 'var(--lab-fg-subtle)',
  },
  '.cm-live-list-mark': {
    color: 'var(--lab-accent)',
  },
  '.cm-live-list-item': {
    paddingLeft: '0.25em',
  },
  '.cm-live-blockquote': {
    borderLeft: '3px solid var(--lab-accent-soft)',
    paddingLeft: '1em',
    color: 'var(--lab-fg-muted)',
  },
  '.cm-live-codeblock': {
    backgroundColor: 'var(--lab-code-bg)',
    borderLeft: '3px solid var(--lab-border-strong)',
    color: 'var(--lab-code-fg)',
    fontFamily: 'var(--lab-font-mono)',
    fontSize: '0.9em',
    lineHeight: '1.65',
  },
  '.cm-live-table-line': {
    fontFamily: 'var(--lab-font-mono)',
    fontSize: '0.88em',
  },
  '.cm-live-task': {
    width: '16px',
    height: '16px',
    margin: '0 0.45em 0 0',
    verticalAlign: '-2px',
    accentColor: 'var(--lab-accent)',
    cursor: 'pointer',
  },
  '.cm-live-hr': {
    display: 'block',
    height: '1px',
    margin: '0.8em 0',
    backgroundColor: 'var(--lab-border-strong)',
  },
  '.cm-live-image-block': {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    margin: '10px 0 18px',
  },
  '.cm-live-image-block img': {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '520px',
    borderRadius: '10px',
    boxShadow: '0 8px 28px color-mix(in srgb, #000 18%, transparent)',
    objectFit: 'contain',
  },
  '.cm-live-image-loading, .cm-live-image-error': {
    display: 'inline-flex',
    minHeight: '32px',
    alignItems: 'center',
    padding: '6px 10px',
    border: '1px dashed var(--lab-border)',
    borderRadius: '7px',
    color: 'var(--lab-fg-subtle)',
    fontSize: '12px',
  },
  '.cm-live-image-error': {
    color: 'var(--lab-link)',
    textDecoration: 'line-through',
  },
  '.cm-live-image-caption': {
    color: 'var(--lab-fg-subtle)',
    fontSize: '12px',
  },
  '.cm-live-math': {
    display: 'inline-block',
    padding: '0 1px',
    borderRadius: '3px',
    backgroundColor: 'color-mix(in srgb, var(--lab-link) 7%, transparent)',
    cursor: 'text',
  },
  '.cm-live-math--block': {
    display: 'block',
    margin: '0.7em 0',
    padding: '0.7em 0.5em',
    textAlign: 'center',
    overflowX: 'auto',
  },
  '.cm-live-table': {
    margin: '0.8em 0 1.2em',
    overflowX: 'auto',
  },
  '.cm-live-table table': {
    width: '100%',
    minWidth: '420px',
    borderCollapse: 'collapse',
    fontSize: '0.9em',
  },
  '.cm-live-table th, .cm-live-table td': {
    padding: '0.5em 0.7em',
    border: '1px solid var(--lab-border)',
    textAlign: 'left',
    verticalAlign: 'top',
  },
  '.cm-live-table th': {
    backgroundColor: 'var(--lab-code-bg)',
    color: 'var(--lab-editor-fg)',
    fontWeight: '600',
  },
  '.cm-live-table tbody tr:nth-child(even)': {
    backgroundColor: 'color-mix(in srgb, var(--lab-panel) 42%, transparent)',
  },
});

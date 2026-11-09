import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { markdown } from '@codemirror/lang-markdown';
import { Table, TaskList, Strikethrough } from '@lezer/markdown';
import {
  Compartment,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
} from '@codemirror/view';

import { callouts } from './callouts';
import { markdownCodeLanguages } from './codeLanguages';
import { coreSetup } from './core/setup';
import { frontmatterField } from './frontmatter';
import { imageBlocks } from './imageBlocks';
import { externalLinkClicks } from './linkClicks';
import { livePreview } from './livePreview';
import { livePreviewTheme } from './livePreviewTheme';
import { mathPreview } from './math';
import { inlineTags } from './tags';
import { tableWidget } from './tableWidget';
import { wikiLinks } from './wikiLinks';

export type EditorMode = 'live' | 'source';

export interface LivePreviewEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly mode?: EditorMode;
  readonly readOnly?: boolean;
  readonly wikiSuggestions?: readonly string[];
  readonly isWikiLinkResolved?: (target: string) => boolean;
  readonly onOpenWikiLink?: (target: string) => void;
  readonly onOpenTag?: (tag: string) => void;
  readonly resolveImage?: (
    src: string,
    alt: string,
  ) => string | Promise<string>;
  readonly onOpenLink?: (href: string) => void;
  /** Host extensions layered after the built-ins. */
  readonly extensions?: readonly Extension[];
  readonly ariaLabel?: string;
  readonly className?: string;
}

export interface LivePreviewEditorHandle {
  focus(): void;
  getView(): EditorView | null;
  getMarkdown(): string;
}

const editableExtensions = (readOnly: boolean): Extension => [
  EditorView.editable.of(!readOnly),
  EditorState.readOnly.of(readOnly),
];

const EMPTY_EXTENSIONS: readonly Extension[] = [];

export const LivePreviewEditor = forwardRef<
  LivePreviewEditorHandle,
  LivePreviewEditorProps
>(function LivePreviewEditor(
  {
    value,
    onChange,
    mode = 'live',
    readOnly = false,
    wikiSuggestions = [],
    isWikiLinkResolved,
    onOpenWikiLink,
    onOpenTag,
    resolveImage,
    onOpenLink,
    extensions = EMPTY_EXTENSIONS,
    ariaLabel = 'Markdown editor',
    className,
  },
  ref,
): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const externalSyncRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const modeRef = useRef(mode);
  const readOnlyRef = useRef(readOnly);
  const wikiSuggestionsRef = useRef<readonly string[]>(wikiSuggestions);
  const isWikiLinkResolvedRef = useRef(isWikiLinkResolved);
  const onOpenWikiLinkRef = useRef(onOpenWikiLink);
  const onOpenTagRef = useRef(onOpenTag);
  const resolveImageRef = useRef(resolveImage);
  const onOpenLinkRef = useRef(onOpenLink);
  const livePreviewCompartment = useRef(new Compartment());
  const lineNumbersCompartment = useRef(new Compartment());
  const editableCompartment = useRef(new Compartment());

  valueRef.current = value;
  onChangeRef.current = onChange;
  modeRef.current = mode;
  readOnlyRef.current = readOnly;
  wikiSuggestionsRef.current = wikiSuggestions;
  isWikiLinkResolvedRef.current = isWikiLinkResolved;
  onOpenWikiLinkRef.current = onOpenWikiLink;
  onOpenTagRef.current = onOpenTag;
  resolveImageRef.current = resolveImage;
  onOpenLinkRef.current = onOpenLink;
  const extensionsRef = useRef<readonly Extension[]>(extensions);
  extensionsRef.current = extensions;
  const extensionsCompartment = useRef(new Compartment());

  const buildLiveExtensions = (): Extension => [
    livePreview(),
    imageBlocks({
      resolveSrc: (src, alt) => resolveImageRef.current?.(src, alt) ?? src,
    }),
    frontmatterField(),
    callouts(),
    inlineTags({ onOpen: (tag) => onOpenTagRef.current?.(tag) }),
    mathPreview(),
    tableWidget(),
  ];

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return undefined;

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        coreSetup,
        markdown({
          extensions: [Table, TaskList, Strikethrough],
          codeLanguages: markdownCodeLanguages,
        }),
        lineNumbersCompartment.current.of(
          modeRef.current === 'source' ? lineNumbers() : [],
        ),
        livePreviewCompartment.current.of(
          modeRef.current === 'live' ? buildLiveExtensions() : [],
        ),
        wikiLinks({
          suggestions: () => wikiSuggestionsRef.current,
          isResolved: (target) =>
            isWikiLinkResolvedRef.current?.(target) ?? true,
          onOpen: (target) => onOpenWikiLinkRef.current?.(target),
        }),
        editableCompartment.current.of(
          editableExtensions(readOnlyRef.current),
        ),
        livePreviewTheme,
        externalLinkClicks((href) => onOpenLinkRef.current?.(href)),
        extensionsCompartment.current.of(extensionsRef.current),
        EditorView.contentAttributes.of({
          'aria-label': ariaLabel,
          spellcheck: 'true',
          autocapitalize: 'off',
          autocorrect: 'off',
        }),
        EditorState.tabSize.of(2),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !externalSyncRef.current) {
            const next = update.state.doc.toString();
            valueRef.current = next;
            onChangeRef.current(next);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    return () => {
      view.destroy();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, [ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    view.dispatch({
      effects: [
        livePreviewCompartment.current.reconfigure(
          mode === 'live' ? buildLiveExtensions() : [],
        ),
        lineNumbersCompartment.current.reconfigure(
          mode === 'source' ? lineNumbers() : [],
        ),
      ],
    });
  }, [mode]);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    view.dispatch({
      effects: editableCompartment.current.reconfigure(
        editableExtensions(readOnly),
      ),
    });
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    view.dispatch({
      effects: extensionsCompartment.current.reconfigure(extensions),
    });
  }, [extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    const existing = view.state.doc.toString();
    if (existing === value) return;
    const selection = view.state.selection.main;
    const max = value.length;
    externalSyncRef.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: existing.length, insert: value },
        selection: {
          anchor: Math.min(selection.anchor, max),
          head: Math.min(selection.head, max),
        },
        annotations: Transaction.addToHistory.of(true),
      });
    } finally {
      externalSyncRef.current = false;
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus() {
      viewRef.current?.focus();
    },
    getView() {
      return viewRef.current;
    },
    getMarkdown() {
      return viewRef.current?.state.doc.toString() ?? '';
    },
  }));

  return (
    <div
      ref={hostRef}
      className={className === undefined ? 'lab-editor' : `lab-editor ${className}`}
    />
  );
});

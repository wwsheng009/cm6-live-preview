import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import {
  EditorState,
  RangeSetBuilder,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

export interface WikiLinkRange {
  readonly from: number;
  readonly to: number;
  readonly target: string;
  readonly alias: string;
  readonly embedded: boolean;
}

export interface WikiLinksOptions {
  readonly suggestions?: () => readonly string[];
  readonly isResolved?: (target: string) => boolean;
  readonly onOpen?: (target: string) => void;
}

const FENCE = /^(`{3,}|~{3,})/;
const WIKILINK = /^\[\[([^[\]\n|]+)(?:\|([^[\]\n]+))?\]\]/;
const EMBED = /^!\[\[([^[\]\n|]+)(?:\|([^[\]\n]+))?\]\]/;
const MAX_SUGGESTIONS = 50;

const normalize = (value: string): string =>
  value.normalize('NFKC').toLocaleLowerCase();

/** Find wikilinks while skipping fenced and inline code. */
export const scanWikiLinks = (value: string): readonly WikiLinkRange[] => {
  const ranges: WikiLinkRange[] = [];
  let offset = 0;
  let fence: { readonly char: string; readonly marker: string } | null = null;

  for (const line of value.split('\n')) {
    const lineOffset = offset;
    offset += line.length + 1;
    const fenceMatch = FENCE.exec(line.trimStart());

    if (fence !== null) {
      if (
        fenceMatch !== null &&
        fenceMatch[1]?.startsWith(fence.char) === true &&
        (fenceMatch[1]?.length ?? 0) >= fence.marker.length
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch !== null) {
      const marker = fenceMatch[1] ?? '';
      fence = { char: marker[0] ?? '`', marker };
      continue;
    }

    let index = 0;
    while (index < line.length) {
      if (line[index] === '`') {
        let count = 1;
        while (line[index + count] === '`') count += 1;
        const marker = line.slice(index, index + count);
        const close = line.indexOf(marker, index + count);
        index = close < 0 ? index + count : close + count;
        continue;
      }
      const embedded = line.startsWith('![[', index);
      if (embedded || line.startsWith('[[', index)) {
        const match = (embedded ? EMBED : WIKILINK).exec(
          line.slice(index),
        );
        if (match !== null) {
          const target = (match[1] ?? '').trim();
          if (target !== '') {
            ranges.push({
              from: lineOffset + index,
              to: lineOffset + index + match[0].length,
              target,
              alias: (match[2] ?? '').trim(),
              embedded,
            });
          }
          index += match[0].length;
          continue;
        }
      }
      index += 1;
    }
  }
  return ranges;
};

export const wikiLinkCompletionOptions = (
  query: string,
  titles: readonly string[],
): readonly Completion[] => {
  const needle = normalize(query.trim());
  const unique = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];
  const matched = unique.filter(
    (title) => needle === '' || normalize(title).includes(needle),
  );
  matched.sort((left, right) => {
    const leftPrefix = normalize(left).startsWith(needle);
    const rightPrefix = normalize(right).startsWith(needle);
    if (leftPrefix !== rightPrefix) return leftPrefix ? -1 : 1;
    return left.localeCompare(right);
  });
  return matched.slice(0, MAX_SUGGESTIONS).map((title) => ({
    label: title,
    type: 'text',
    apply: `[[${title}]]`,
  }));
};

const completionSource =
  (getTitles: () => readonly string[]) =>
  (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\[\[[^[\]\n|]*$/);
    if (match === null) return null;
    const options = wikiLinkCompletionOptions(
      match.text.slice(2),
      getTitles(),
    );
    if (options.length === 0) return null;
    const to =
      context.state.sliceDoc(match.to, match.to + 2) === ']]'
        ? match.to + 2
        : match.to;
    return { from: match.from, to, options, filter: false };
  };

const buildDecorations = (
  state: EditorState,
  options: WikiLinksOptions,
): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of scanWikiLinks(state.doc.toString())) {
    const resolved = options.isResolved?.(range.target) ?? true;
    const baseClass = range.embedded ? 'cm-live-embed' : 'cm-live-wikilink';
    builder.add(
      range.from,
      range.to,
      Decoration.mark({
        class: `${baseClass}${
          resolved ? '' : ' cm-live-wikilink--unresolved'
        }`,
        attributes: {
          'data-wikilink-target': range.target,
          'data-wikilink-embed': range.embedded ? 'true' : 'false',
          title: range.target,
        },
      }),
    );
  }
  return builder.finish();
};

/**
 * Wiki link decorations, Ctrl/Cmd+click navigation, and `[[` autocomplete.
 *
 * The source stays portable Markdown; all rendering is decoration-only.
 */
export const wikiLinks = (options: WikiLinksOptions = {}): Extension => {
  const source = completionSource(options.suggestions ?? (() => []));
  const decorations = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view.state, options);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.decorations = buildDecorations(update.state, options);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );

  return [
    decorations,
    EditorState.languageData.of(() => [{ autocomplete: source }]),
    EditorView.domEventHandlers({
      click: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return false;
        if (!(event.target instanceof Element)) return false;
        const element = event.target.closest<HTMLElement>(
          '.cm-live-wikilink, .cm-live-embed',
        );
        const target = element?.dataset.wikilinkTarget?.trim() ?? '';
        if (target === '') return false;
        event.preventDefault();
        options.onOpen?.(target);
        return true;
      },
    }),
  ];
};

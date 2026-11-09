import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import {
  StateField,
  type EditorState,
  type Extension,
  type Range,
} from '@codemirror/state';

export interface ImageBlocksOptions {
  /** Resolve a Markdown image destination to a browser-loadable URL. */
  readonly resolveSrc?: (src: string, alt: string) => string;
}

interface ParsedImage {
  readonly alt: string;
  readonly src: string;
}

const parseImage = (raw: string): ParsedImage | null => {
  const match = /^!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)$/.exec(
    raw,
  );
  if (match === null) return null;
  return { alt: match[1] ?? '', src: match[2] ?? '' };
};

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-live-image-block';
    const image = document.createElement('img');
    image.src = this.src;
    image.alt = this.alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    wrapper.append(image);
    if (this.alt !== '') {
      const caption = document.createElement('span');
      caption.className = 'cm-live-image-caption';
      caption.textContent = this.alt;
      wrapper.append(caption);
    }
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const imageDecorations = (
  state: EditorState,
  options: ImageBlocksOptions,
): DecorationSet => {
  ensureSyntaxTree(state, state.doc.length, 200);
  const ranges: Range<Decoration>[] = [];
  const seen = new Set<string>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Image') return;
      const parsed = parseImage(state.doc.sliceString(node.from, node.to));
      if (parsed === null) return;
      const line = state.doc.lineAt(node.from);
      const key = `${line.from}:${parsed.src}:${parsed.alt}`;
      if (seen.has(key)) return;
      seen.add(key);
      const src = options.resolveSrc?.(parsed.src, parsed.alt) ?? parsed.src;
      if (src === '') return;
      ranges.push(
        Decoration.widget({
          widget: new ImageWidget(src, parsed.alt),
          block: true,
          side: 1,
        }).range(line.to),
      );
    },
  });
  return Decoration.set(ranges, true);
};

/**
 * Render Markdown images below their source line.
 *
 * Block decorations need a StateField rather than a ViewPlugin; this is the
 * one reason image previews live in their own field.
 */
export const imageBlocks = (options: ImageBlocksOptions = {}): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => imageDecorations(state, options),
    update: (value, transaction) =>
      transaction.docChanged
        ? imageDecorations(transaction.state, options)
        : value,
    provide: (field) => EditorView.decorations.from(field),
  });

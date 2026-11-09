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
  readonly resolveSrc?: (
    src: string,
    alt: string,
  ) => string | Promise<string>;
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
    readonly rawSrc: string,
    readonly alt: string,
    readonly resolveSrc:
      | ((src: string, alt: string) => string | Promise<string>)
      | undefined,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return other.rawSrc === this.rawSrc && other.alt === this.alt;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-live-image-block';
    const render = (src: string): void => {
      const image = document.createElement('img');
      image.src = src;
      image.alt = this.alt;
      image.loading = 'lazy';
      image.decoding = 'async';
      wrapper.replaceChildren(image);
      if (this.alt !== '') {
        const caption = document.createElement('span');
        caption.className = 'cm-live-image-caption';
        caption.textContent = this.alt;
        wrapper.append(caption);
      }
    };
    if (this.resolveSrc === undefined) {
      render(this.rawSrc);
      return wrapper;
    }

    const loading = document.createElement('span');
    loading.className = 'cm-live-image-loading';
    loading.textContent = 'Loading image…';
    wrapper.append(loading);
    void Promise.resolve(this.resolveSrc(this.rawSrc, this.alt))
      .then((src) => {
        if (src === '') throw new Error('empty image source');
        render(src);
      })
      .catch(() => {
        const error = document.createElement('span');
        error.className = 'cm-live-image-error';
        error.textContent = this.alt === '' ? 'Image unavailable' : this.alt;
        wrapper.replaceChildren(error);
      });
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
      ranges.push(
        Decoration.widget({
          widget: new ImageWidget(
            parsed.src,
            parsed.alt,
            options.resolveSrc,
          ),
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

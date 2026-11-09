import {
  StateField,
  type Extension,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';

export interface FrontmatterEntry {
  readonly key: string;
  readonly value: string;
}

export interface ParsedFrontmatter {
  readonly from: number;
  readonly to: number;
  readonly entries: readonly FrontmatterEntry[];
}

export const parseFrontmatter = (
  value: string,
): ParsedFrontmatter | null => {
  const lines = value.split('\n');
  if ((lines[0] ?? '').trim() !== '---') return null;
  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if ((lines[index] ?? '').trim() === '---') {
      closing = index;
      break;
    }
  }
  if (closing < 0) return null;

  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  const entries: FrontmatterEntry[] = [];
  for (let index = 1; index < closing; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    entries.push({
      key: line.slice(0, colon).trim(),
      value: line.slice(colon + 1).trim(),
    });
  }

  return {
    from: offsets[0] ?? 0,
    to: (offsets[closing] ?? 0) + (lines[closing]?.length ?? 0),
    entries,
  };
};

class FrontmatterWidget extends WidgetType {
  constructor(
    readonly entries: readonly FrontmatterEntry[],
    readonly from: number,
  ) {
    super();
  }

  eq(other: FrontmatterWidget): boolean {
    return other.from === this.from && other.entries === this.entries;
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'cm-live-frontmatter';
    card.addEventListener('mousedown', (event) => {
      event.preventDefault();
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    });

    const title = document.createElement('div');
    title.className = 'cm-live-frontmatter__title';
    title.textContent = 'Properties';
    card.append(title);

    for (const entry of this.entries) {
      const row = document.createElement('div');
      row.className = 'cm-live-frontmatter__row';
      const key = document.createElement('span');
      key.className = 'cm-live-frontmatter__key';
      key.textContent = entry.key;
      const value = document.createElement('span');
      value.className = 'cm-live-frontmatter__value';
      value.textContent = entry.value;
      row.append(key, value);
      card.append(row);
    }
    return card;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const buildFrontmatter = (state: EditorView['state']): DecorationSet => {
  const parsed = parseFrontmatter(state.doc.toString());
  if (parsed === null) return Decoration.none;
  const active = state.selection.ranges.some(
    (range) => range.from <= parsed.to && range.to >= parsed.from,
  );
  if (active) return Decoration.none;
  const ranges: Range<Decoration>[] = [
    Decoration.replace({
      widget: new FrontmatterWidget(parsed.entries, parsed.from),
      block: true,
    }).range(parsed.from, parsed.to),
  ];
  return Decoration.set(ranges, true);
};

/** Replace inactive frontmatter with a compact properties card. */
export const frontmatterField = (): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => buildFrontmatter(state),
    update: (value, transaction) =>
      transaction.docChanged || transaction.selection
        ? buildFrontmatter(transaction.state)
        : value,
    provide: (field) => EditorView.decorations.from(field),
  });

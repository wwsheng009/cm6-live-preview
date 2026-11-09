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
    readonly to: number,
    readonly raw: string,
  ) {
    super();
  }

  eq(other: FrontmatterWidget): boolean {
    return (
      other.from === this.from &&
      other.to === this.to &&
      other.raw === this.raw
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'cm-live-frontmatter';
    const toolbar = document.createElement('div');
    toolbar.className = 'cm-live-frontmatter__toolbar';

    const title = document.createElement('div');
    title.className = 'cm-live-frontmatter__title';
    title.textContent = 'Properties';
    toolbar.append(title);

    const source = document.createElement('button');
    source.type = 'button';
    source.className = 'cm-live-frontmatter__action';
    source.textContent = 'Markdown';
    source.addEventListener('mousedown', (event) => event.preventDefault());
    source.addEventListener('click', () => {
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    });

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'cm-live-frontmatter__action cm-live-frontmatter__action--primary';
    save.textContent = 'Save';
    save.addEventListener('mousedown', (event) => event.preventDefault());
    toolbar.append(source, save);
    card.append(toolbar);

    for (const entry of this.entries) {
      const row = document.createElement('div');
      row.className = 'cm-live-frontmatter__row';
      const key = document.createElement('span');
      key.className = 'cm-live-frontmatter__key';
      key.textContent = entry.key;
      const value = document.createElement('span');
      value.className = 'cm-live-frontmatter__value';
      value.textContent = entry.value;
      value.contentEditable = 'true';
      value.spellcheck = false;
      row.append(key, value);
      card.append(row);
    }

    const commit = (): void => {
      const entries = [...card.querySelectorAll('.cm-live-frontmatter__row')]
        .map((row) => {
          const key = row.querySelector('.cm-live-frontmatter__key')?.textContent ?? '';
          const value = row.querySelector('.cm-live-frontmatter__value')?.textContent ?? '';
          return { key: key.trim(), value: value.trim() };
        })
        .filter((entry) => entry.key !== '');
      const next = [
        '---',
        ...entries.map((entry) => `${entry.key}: ${entry.value}`),
        '---',
      ].join('\n');
      if (next === this.raw) return;
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: next },
        userEvent: 'input',
      });
      view.focus();
    };
    save.addEventListener('click', commit);
    card.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        commit();
      }
    });
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
  const raw = state.doc.sliceString(parsed.from, parsed.to);
  const ranges: Range<Decoration>[] = [
    Decoration.replace({
      widget: new FrontmatterWidget(
        parsed.entries,
        parsed.from,
        parsed.to,
        raw,
      ),
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

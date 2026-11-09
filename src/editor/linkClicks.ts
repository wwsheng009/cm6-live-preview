import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/** Ctrl/Cmd+click `[label](url)` while editing. */
export const externalLinkClicks = (
  onOpen: (href: string) => void,
): Extension =>
  EditorView.domEventHandlers({
    click: (event) => {
      if (!(event.ctrlKey || event.metaKey)) return false;
      if (!(event.target instanceof Element)) return false;
      const element = event.target.closest<HTMLElement>('.cm-live-link');
      const href = element?.dataset.href?.trim() ?? '';
      if (href === '') return false;
      event.preventDefault();
      onOpen(href);
      return true;
    },
  });

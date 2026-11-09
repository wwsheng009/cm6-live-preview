import { createRef } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LivePreviewEditor,
  type LivePreviewEditorHandle,
} from '../LivePreviewEditor';

afterEach(() => {
  cleanup();
});

describe('LivePreviewEditor', () => {
  it('mounts the live preview and reports document changes', async () => {
    const ref = createRef<LivePreviewEditorHandle>();
    const onChange = vi.fn();
    render(
      <LivePreviewEditor
        ref={ref}
        value={'# Hello\n\nA **bold** line.'}
        onChange={onChange}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('.cm-live-h1')).not.toBeNull(),
    );
    const view = ref.current?.getView();
    expect(view).not.toBeNull();
    view?.dispatch({ changes: { from: 0, to: 0, insert: '>' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('switches from live preview to source and read-only modes', async () => {
    const { rerender } = render(
      <LivePreviewEditor
        value={'# Hello'}
        onChange={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector('.cm-live-h1')).not.toBeNull(),
    );

    rerender(
      <LivePreviewEditor
        value={'# Hello'}
        mode="source"
        onChange={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector('.cm-live-h1')).toBeNull(),
    );
    expect(
      [...document.querySelectorAll('.cm-gutterElement')].some(
        (element) => element.textContent === '1',
      ),
    ).toBe(true);

    rerender(
      <LivePreviewEditor
        value={'# Hello'}
        mode="source"
        readOnly
        onChange={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(
        document.querySelector('.cm-content')?.getAttribute(
          'contenteditable',
        ),
      ).toBe('false'),
    );
  });
});

import { LanguageDescription } from '@codemirror/language';

/**
 * Curated fenced-code languages.
 *
 * Each grammar is loaded with a dynamic import so unused languages do not
 * inflate the initial editor chunk.
 */
export const markdownCodeLanguages = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'jsx'],
    extensions: ['js', 'jsx'],
    load: () =>
      import('@codemirror/lang-javascript').then(({ javascript }) =>
        javascript({ jsx: true }),
      ),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts'],
    extensions: ['ts'],
    load: () =>
      import('@codemirror/lang-javascript').then(({ javascript }) =>
        javascript({ typescript: true }),
      ),
  }),
  LanguageDescription.of({
    name: 'TSX',
    alias: ['tsx'],
    extensions: ['tsx'],
    load: () =>
      import('@codemirror/lang-javascript').then(({ javascript }) =>
        javascript({ typescript: true, jsx: true }),
      ),
  }),
  LanguageDescription.of({
    name: 'Python',
    alias: ['py'],
    extensions: ['py'],
    load: () =>
      import('@codemirror/lang-python').then(({ python }) => python()),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['htm'],
    extensions: ['html', 'htm'],
    load: () => import('@codemirror/lang-html').then(({ html }) => html()),
  }),
  LanguageDescription.of({
    name: 'CSS',
    extensions: ['css'],
    load: () => import('@codemirror/lang-css').then(({ css }) => css()),
  }),
  LanguageDescription.of({
    name: 'JSON',
    extensions: ['json'],
    load: () => import('@codemirror/lang-json').then(({ json }) => json()),
  }),
] as const;

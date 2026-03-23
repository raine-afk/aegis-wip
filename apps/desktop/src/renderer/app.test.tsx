import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { App } from './app';

describe('App shell', () => {
  test('renders the workstream surface with collapsed side panels', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('Workstream');
    expect(markup).toContain('Tasks');
    expect(markup).toContain('Memory');
    expect(markup).toContain('Git');
    expect(markup).toContain('Inspect');
    expect(markup).toContain('Browser');
  });
});

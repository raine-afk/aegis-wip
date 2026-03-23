import { useEffect, useState } from 'react';

type AegisApi = {
  getAppVersion: () => Promise<string>;
};

declare global {
  interface Window {
    aegis?: AegisApi;
  }
}

const panelGroups = {
  left: ['Tasks', 'Memory', 'Git'],
  right: ['Inspect', 'Browser'],
} as const;

export const App = () => {
  const [appVersion, setAppVersion] = useState('desktop shell');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.aegis) {
      return;
    }

    void window.aegis
      .getAppVersion()
      .then((version) => setAppVersion(`v${version}`))
      .catch(() => setAppVersion('desktop shell'));
  }, []);

  return (
    <div className="shell">
      <aside className="side-rail" aria-label="Primary side panels">
        <span className="rail-label">Panels</span>
        {panelGroups.left.map((panel) => (
          <button key={panel} className="panel-chip" type="button">
            {panel}
          </button>
        ))}
      </aside>

      <main className="workstream" aria-label="Aegis workstream">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Aegis</p>
            <h1>Workstream</h1>
            <p className="hero-copy">
              One surface for long-running coding work. The runtime comes next; for now the shell stays clean,
              focused, and ready.
            </p>
          </div>
          <div className="hero-meta">
            <span className="status-pill">{appVersion}</span>
            <span className="status-pill muted">Preload bridge wired</span>
          </div>
        </header>

        <section className="canvas-card" aria-label="Current workstream">
          <div className="canvas-header">
            <h2>Current session</h2>
            <span className="canvas-badge">Empty state</span>
          </div>
          <div className="canvas-body">
            <p>No task is running yet.</p>
            <ul>
              <li>Launch or resume an agent session from the workstream.</li>
              <li>Open panels only when you need task context, memory, git, inspect, or browser state.</li>
              <li>Keep the center focused on the one thing that matters right now.</li>
            </ul>
          </div>
        </section>
      </main>

      <aside className="side-rail align-end" aria-label="Utility side panels">
        <span className="rail-label">Utilities</span>
        {panelGroups.right.map((panel) => (
          <button key={panel} className="panel-chip" type="button">
            {panel}
          </button>
        ))}
      </aside>
    </div>
  );
};

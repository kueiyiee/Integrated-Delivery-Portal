import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const docsContent: Record<string, { title: string; description: string; bullets: string[] }> = {
    '/docs/getting-started': {
    title: 'Getting started',
    description: 'Set up your environment, create an account, and learn the basic operational flow for the platform.',
    bullets: [
      'Create a workspace account and sign in securely.',
      'Review the dashboard and access the main admin modules.',
      'Use the delivery checklist to onboard your first organization.',
    ],
  },
    '/docs/api': {
    title: 'API reference',
    description: 'Use the platform APIs for authentication, organization management, deliveries, and SYSTEM ADMINISTRATION CONSOLE administration.',
    bullets: [
      'Authenticate with the session token returned from the login endpoint.',
      'Call the admin endpoints for users, roles, and configuration.',
      'Use the delivery and driver endpoints for operational workflows.',
    ],
  },
  '/docs/auth': {
    title: 'Auth flows',
    description: 'Understand the authentication and approval lifecycle for users, organizations, and system administrators.',
    bullets: [
      'Register a new account and await approval when required.',
      'Log in through the standard auth flow and redirect to the correct console.',
      'Reset passwords and manage account security from the protected dashboard.',
    ],
  },
};

export function DocsPage() {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentDoc = docsContent[currentPath] ?? null;

  return (
    <div className="docs-shell">
      <div className="docs-frame">
        <header className="docs-header">
          <div className="docs-header__copy">
            <span className="docs-eyebrow">Developer documentation</span>
            <h1>Build reliable delivery integrations</h1>
            <p>
            Get started with auth, deployment, API integration, and SYSTEM ADMINISTRATION CONSOLE workflows.
            This section is your source for onboarding guides, API references, and release notes.
            </p>
          </div>
          <div className="docs-header__status"><span /> Platform documentation</div>
        </header>

        <div className="docs-layout">
          <aside className="docs-sidebar" aria-label="Documentation navigation">
            <div className="docs-sidebar__label">On this page</div>
            <nav className="docs-nav">
              <Link className={currentPath === '/docs' ? 'is-active' : ''} to="/docs">Overview <span>01</span></Link>
              <Link className={currentPath === '/docs/getting-started' ? 'is-active' : ''} to="/docs/getting-started">Getting started <span>02</span></Link>
              <Link className={currentPath === '/docs/api' ? 'is-active' : ''} to="/docs/api">API reference <span>03</span></Link>
              <Link className={currentPath === '/docs/auth' ? 'is-active' : ''} to="/docs/auth">Auth flows <span>04</span></Link>
            </nav>
            <div className="docs-sidebar__help">
              <span className="docs-sidebar__help-kicker">Need a hand?</span>
              <strong>Follow the setup path</strong>
              <p>Start with authentication, then make your first test request.</p>
            </div>
          </aside>

          <main className="docs-content">
            <section className="docs-content__intro">
              <span className="docs-eyebrow">{currentDoc ? 'Guide' : 'Start here'}</span>
              <h2>{currentDoc?.title ?? 'Documentation overview'}</h2>
              <p>{currentDoc?.description ?? 'Choose a guide to move from account setup to a production-ready integration with clear, auditable workflows.'}</p>
            </section>

            {currentDoc ? (
              <section className="docs-article">
                <div className="docs-article__topline"><span>Guide {currentPath === '/docs/getting-started' ? '02' : currentPath === '/docs/api' ? '03' : '04'}</span><Link to="/docs">Back to overview</Link></div>
                <ul className="docs-checklist">
                  {currentDoc.bullets.map((bullet) => <li key={bullet}><span>✓</span>{bullet}</li>)}
                </ul>
              </section>
            ) : (
              <section className="docs-route-grid">
                <Link to="/docs/getting-started" className="docs-route-card"><span>02</span><strong>Getting started</strong><p>Set up your workspace and complete your first operational flow.</p></Link>
                <Link to="/docs/api" className="docs-route-card"><span>03</span><strong>API reference</strong><p>Connect securely to organizations, deliveries, and platform workflows.</p></Link>
                <Link to="/docs/auth" className="docs-route-card"><span>04</span><strong>Auth flows</strong><p>Understand sessions, approvals, password recovery, and access control.</p></Link>
              </section>
            )}

            <section className="docs-next-step">
              <div><span className="docs-eyebrow">Recommended next step</span><h3>{currentDoc ? 'Make your first authenticated request' : 'Begin with the setup guide'}</h3></div>
              <Link to={currentDoc ? '/docs/api' : '/docs/getting-started'}>{currentDoc ? 'Open API reference' : 'Get started'} <span>→</span></Link>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

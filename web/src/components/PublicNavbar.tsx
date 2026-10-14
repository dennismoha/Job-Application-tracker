interface PublicNavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const links = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Privacy', path: '/privacy' },
];

export default function PublicNavbar({ currentPath, onNavigate }: PublicNavbarProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    event.preventDefault();
    onNavigate(path);
  }

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <a className="public-brand" href="/" onClick={(event) => follow(event, '/')}>
          <span className="public-brand-mark">J</span>
          <span>JobIntel</span>
        </a>
        <nav className="public-nav" aria-label="Main navigation">
          {links.map((link) => (
            <a
              key={link.path}
              href={link.path}
              aria-current={currentPath === link.path ? 'page' : undefined}
              onClick={(event) => follow(event, link.path)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="public-nav-actions">
          <a className="public-login-link" href="/login" onClick={(event) => follow(event, '/login')}>
            Log in
          </a>
          <a className="public-signup-link" href="/register" onClick={(event) => follow(event, '/register')}>
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
import type { MouseEvent } from 'react';


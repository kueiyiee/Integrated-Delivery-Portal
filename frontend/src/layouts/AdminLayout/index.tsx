import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Database, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserCog, Webhook, X } from 'lucide-react';

type SidebarMode = 'expanded' | 'compact' | 'collapsed';

function getInitialSidebarMode(storageKey: string): SidebarMode {
  if (typeof window === 'undefined') return 'expanded';

  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'expanded' || stored === 'compact' || stored === 'collapsed') {
    return stored;
  }

  const legacy = window.localStorage.getItem('admin_sidebar_collapsed');
  if (legacy === 'true') return 'collapsed';
  if (legacy === 'false') return window.innerWidth < 1100 ? 'compact' : 'expanded';

  return window.innerWidth < 1100 ? 'compact' : 'expanded';
}
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useToast } from '../../components/ui/ToastProvider';
import { resolveMediaUrl } from '../../utils/media';

const navigationItems = [
  { to: '/admin', label: 'Executive Overview', icon: LayoutDashboard },
  { to: '/admin/companies', label: 'Company Governance', icon: Building2 },
  { to: '/admin/api-keys', label: 'API Integrations', icon: Webhook },
  { to: '/admin/data-lifecycle', label: 'Data Lifecycle & Controls', icon: Database },
  { to: '/admin/reports', label: 'Audit & Intelligence', icon: ShieldCheck },
  { to: '/admin/profile', label: 'Admin Profile & Security', icon: UserCog },
];

export function AdminLayout() {
  const auth = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [sidebarMode, setSidebarMode] = useState(() => getInitialSidebarMode('admin_sidebar_mode') as SidebarMode);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedWidth = window.localStorage.getItem('admin_sidebar_width');
    return storedWidth ? Number(storedWidth) : null;
  });
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const sidebarWidthRef = useRef(sidebarWidth ?? (sidebarMode === 'collapsed' ? 72 : sidebarMode === 'compact' ? 220 : 260));

  const setSidebarWidthValue = (width: number) => {
    sidebarWidthRef.current = width;
    setSidebarWidth(width);
  };

  const defaultSidebarWidth = (mode: SidebarMode) => (mode === 'collapsed' ? 72 : mode === 'compact' ? 220 : 260);
  const resolveSidebarModeFromWidth = (width: number): SidebarMode => (width <= 90 ? 'collapsed' : width <= 240 ? 'compact' : 'expanded');

  const [density, setDensity] = useState<string>(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('ui_density') : null;
      if (stored) return stored;
    } catch {}
    if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-ui-density')) return document.documentElement.getAttribute('data-ui-density') as string;
    return 'comfortable';
  });

  // Single source of truth: every color below is a shared theme variable
  // (see src/styles/app.css) so this layout always stays in sync with the
  // rest of the application in both Light and Dark mode.
  const theme = {
    rootBg: 'var(--surface-1)',
    sidebarBg: 'var(--surface-2)',
    sidebarBorder: 'var(--border)',
    mainBg: 'var(--surface-1)',
    text: 'var(--text-primary)',
    muted: 'var(--text-muted)',
    cardBg: 'var(--surface-2)',
    cardBorder: 'var(--border)',
    navActiveBg: 'var(--nav-active-bg)',
    navActiveText: 'var(--nav-active-text)',
    navInactiveText: 'var(--text-muted)',
    navInactiveHover: 'var(--nav-hover-bg)',
    accent: 'var(--accent)',
    accentSubtle: 'var(--accent-soft)',
    badgeBg: 'var(--success-soft)',
    badgeText: 'var(--success)',
    badgeBorder: 'var(--success-border)',
    inputBg: 'var(--input-bg)',
    surfaceElevated: 'var(--surface-elevated)',
    dangerSoft: 'var(--danger-soft)',
    dangerBorder: 'var(--danger-border)',
    danger: 'var(--danger)',
  };

  useEffect(() => {
    const handleResize = () => {
      setMobileView(window.innerWidth < 980);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('admin_sidebar_mode', sidebarMode);
      window.localStorage.setItem('admin_sidebar_collapsed', String(sidebarMode === 'collapsed'));
    } catch {
      // ignore local storage failures
    }
  }, [sidebarMode]);

  const isCollapsed = sidebarMode === 'collapsed';
  const isCompact = sidebarMode === 'compact';
  const isExpanded = sidebarMode === 'expanded';
  const modeOptions = useMemo(() => [
    { mode: 'expanded' as const, label: 'Expanded', short: 'Exp' },
    { mode: 'compact' as const, label: 'Compact', short: 'Cmp' },
    { mode: 'collapsed' as const, label: 'Collapsed', short: 'Cls' },
  ], []);

  const currentItem = useMemo(() => {
    return navigationItems.find((item) => location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to)));
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    if (!currentItem) {
      return [{ label: 'Home', to: '/admin' }];
    }

    return [{ label: 'ADMIN CONSOLE', to: '/admin' }, { label: currentItem.label }];
  }, [currentItem]);

  const handleNavigate = () => {
    if (mobileView) {
      setMobileOpen(false);
    }
  };

  const setSidebarModeAndWidth = (nextMode: SidebarMode) => {
    setSidebarMode(nextMode);
    const width = defaultSidebarWidth(nextMode);
    setSidebarWidthValue(width);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('admin_sidebar_width', String(width));
    } catch {
      // ignore local storage failures
    }
  };

  const handleSidebarResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mobileView) return;
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = sidebarWidthRef.current;
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (event: PointerEvent) => {
      const nextWidth = Math.max(72, Math.min(360, startWidthRef.current + (event.clientX - startXRef.current)));
      setSidebarWidthValue(nextWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      const nextWidth = sidebarWidthRef.current;
      const nextMode = resolveSidebarModeFromWidth(nextWidth);
      setSidebarMode(nextMode);
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem('admin_sidebar_width', String(nextWidth));
      } catch {
        // ignore local storage failures
      }
    };

    document.body.style.cursor = 'ew-resize';
    document.addEventListener('pointermove', handleResizeMove);
    document.addEventListener('pointerup', handleResizeEnd);
    document.addEventListener('pointercancel', handleResizeEnd);

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', handleResizeMove);
      document.removeEventListener('pointerup', handleResizeEnd);
      document.removeEventListener('pointercancel', handleResizeEnd);
    };
  }, [isResizing]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-ui-density', density);
    try {
      window.localStorage.setItem('ui_density', density);
    } catch {}
  }, [density]);

  return (
    <div style={{ minHeight: '100vh', height: '100%', overflow: 'hidden', color: theme.text, background: theme.rootBg }}>
      {mobileView && mobileOpen ? <div className="layout-mobile-backdrop" onClick={() => setMobileOpen(false)} /> : null}
      {mobileView ? (
        <div className="layout-mobile-topbar" style={{ paddingLeft: 'calc(var(--safe-area-left, 0px) + 0.95rem)' }}>
          <button type="button" className="layout-mobile-topbar__button" onClick={() => setMobileOpen((value) => !value)} aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <div className="layout-mobile-topbar__title">{currentItem?.label || 'Dashboard'}</div>
          <div className="layout-mobile-topbar__actions">
            <ThemeToggle />
            <button type="button" className="layout-mobile-topbar__button" onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))} aria-label="Toggle density">
              {density === 'compact' ? 'C' : 'D'}
            </button>
          </div>
        </div>
      ) : null}
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <aside
          className={`sidebar layout-aside ${isCollapsed ? 'sidebar--collapsed' : ''} ${isCompact ? 'sidebar--compact' : ''} ${isResizing ? 'sidebar--resizing' : ''}`}
          onMouseEnter={() => !mobileView && setSidebarHovered(true)}
          onMouseLeave={() => !mobileView && setSidebarHovered(false)}
          style={{
            width: mobileView ? (mobileOpen ? 'min(100%, 320px)' : 0) : sidebarWidth ?? defaultSidebarWidth(sidebarMode),
            maxWidth: '100%',
            minWidth: 0,
            padding: mobileView ? (mobileOpen ? '0.9rem 0.75rem' : '0') : isCollapsed ? '0.7rem 0.55rem' : isCompact ? '0.8rem 0.7rem' : '0.9rem 0.75rem',
            borderRight: `1px solid ${theme.sidebarBorder}`,
            background: theme.sidebarBg,
            transition: 'width 220ms ease, padding 220ms ease, transform 220ms ease',
            flexShrink: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: mobileView ? 'fixed' : 'sticky',
            top: 0,
            height: mobileView ? '100%' : '100vh',
            boxSizing: 'border-box',
            zIndex: 30,
            transform: mobileView && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
            boxShadow: mobileView && mobileOpen ? '0 24px 70px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="layout-aside-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', gap: '0.75rem', marginBottom: '1.1rem', paddingBottom: '0.85rem', borderBottom: `1px solid ${theme.sidebarBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                <div
                  className="brand-mark"
                  style={{
                    minWidth: isCollapsed ? 34 : 42,
                    height: isCollapsed ? 34 : 42,
                    padding: 0,
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${theme.accentSubtle}`,
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(15, 118, 110, 0.12))',
                    boxShadow: '0 10px 24px rgba(16, 185, 129, 0.12)',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      inset: 8,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02))',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                    aria-hidden="true"
                  />
                  <span style={{ position: 'relative', zIndex: 1, fontSize: isCollapsed ? '0.7rem' : '0.84rem', fontWeight: 800, letterSpacing: '0.12em', color: theme.accent, textTransform: 'uppercase', lineHeight: 1 }}>IDP</span>
                </div>
                {!isCollapsed ? (
                  <div className="brand-copy" style={{ minWidth: 0, maxWidth: isCompact ? 148 : 220, display: 'grid', gap: '0.12rem' }}>
                    <div className="brand-title" style={{ fontSize: isCompact ? '0.62rem' : '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.text, lineHeight: 1.2 }}>
                      Integrated Delivery Portal
                    </div>
                    {isExpanded ? <div className="brand-subtitle" style={{ fontSize: '0.72rem', color: theme.muted, lineHeight: 1.35, whiteSpace: 'normal' }}>Administration Suite</div> : null}
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className="sidebar-toggle-pill"
                  onClick={() => {
                    if (mobileView) return setMobileOpen((value) => !value);
                    const next = sidebarMode === 'expanded' ? 'compact' : sidebarMode === 'compact' ? 'collapsed' : 'expanded';
                    setSidebarModeAndWidth(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (mobileView) setMobileOpen((v) => !v); else setSidebarMode((value) => value === 'expanded' ? 'compact' : value === 'compact' ? 'collapsed' : 'expanded');
                    }
                  }}
                  aria-controls="admin-sidebar-nav"
                  aria-expanded={mobileView ? mobileOpen : !isCollapsed}
                  aria-label={mobileView ? (mobileOpen ? 'Close sidebar' : 'Open sidebar') : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${theme.sidebarBorder}`, background: theme.surfaceElevated, color: theme.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 28px rgba(2,6,23,0.10)' }}
                >
                  {mobileView ? (mobileOpen ? <X size={18} /> : <Menu size={18} />) : isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
              </div>
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              onPointerDown={handleSidebarResizePointerDown}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 10,
                cursor: mobileView ? 'default' : 'ew-resize',
                zIndex: 32,
              }}
            />

            <nav id="admin-sidebar-nav" style={{ display: 'grid', gap: '0.25rem', paddingBottom: '0.6rem' }} aria-label="Console navigation" aria-hidden={mobileView && !mobileOpen}>
              {navigationItems.map((link) => {
                const isActive = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to));
                const Icon = link.icon;

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={handleNavigate}
                    title={isCollapsed ? link.label : undefined}
                    data-tooltip={isCollapsed && !sidebarHovered ? link.label : undefined}
                    aria-label={link.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`admin-nav-link sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isCollapsed ? 0 : '0.75rem',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      textDecoration: 'none',
                      padding: isCollapsed ? '0.6rem' : '0.6rem 0.75rem',
                      borderRadius: 10,
                      color: isActive ? theme.navActiveText : theme.navInactiveText,
                      background: isActive ? theme.navActiveBg : 'transparent',
                      fontWeight: isActive ? 700 : 500,
                      transition: 'all 160ms ease',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, flexShrink: 0 }}>
                      <Icon size={18} strokeWidth={1.95} />
                    </span>
                    {!isCollapsed ? <span className="nav-label">{link.label}</span> : null}
                  </Link>
                );
              })}
            </nav>

            <div style={{ marginTop: 'auto', display: 'grid', gap: '0.5rem' }}>
              {!isCollapsed ? (
                <div style={{ padding: '0.85rem', borderRadius: 14, border: `1px solid ${theme.sidebarBorder}`, background: theme.surfaceElevated }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <Avatar src={resolveMediaUrl(auth.user?.profile_photo)} name={auth.user?.name} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: theme.text }}>{auth.user?.name || 'System Administrator'}</div>
                      <div style={{ color: theme.muted, fontSize: '0.75rem' }}>{auth.user?.roles?.map((r: any) => r.name).join(', ') || 'System Admin'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="sidebar-profile-avatar"
                  data-tooltip={auth.user?.name || 'System Administrator'}
                  title={auth.user?.name || 'System Administrator'}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.25rem 0' }}
                >
                  <Avatar src={resolveMediaUrl(auth.user?.profile_photo)} name={auth.user?.name} size={34} />
                </div>
              )}
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await toast.confirm({
                    title: 'Sign Out Securely',
                    description: 'Are you sure you want to sign out from the System Administration Console?',
                    confirmLabel: 'Sign Out Securely',
                    cancelLabel: 'Cancel',
                  });
                  if (confirmed) auth.logout();
                }}
                  className={`logout-action ${isCollapsed ? 'logout-action--collapsed' : ''}`}
              >
                <LogOut size={15} />
                {!isCollapsed && <span>Sign Out Securely</span>}
              </button>
            </div>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            padding: 'clamp(1rem, 2vw, 2rem)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'relative',
            background: theme.mainBg,
          }}
        >
          {location.state?.alert ? (
            <div style={{ marginBottom: '1rem', padding: '0.9rem 1.15rem', borderRadius: 12, background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}`, color: theme.badgeText, fontWeight: 600 }}>
              {location.state.alert}
            </div>
          ) : null}
          <header
            style={{
              padding: mobileView ? '0.85rem 0.95rem' : '0.9rem 1rem',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.02))',
              border: `1px solid ${theme.cardBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.8rem',
              flexWrap: 'wrap',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center', color: theme.accent, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={item.label}>
                    {index > 0 && <span style={{ opacity: 0.7 }}>/</span>}
                    {item.to ? <Link to={item.to} style={{ color: 'inherit', textDecoration: 'none', opacity: 0.92 }}>{item.label}</Link> : <span>{item.label}</span>}
                  </React.Fragment>
                ))}
              </div>
              <h1 style={{ margin: '0.38rem 0 0', fontSize: mobileView ? '1.1rem' : '1.25rem', lineHeight: 1.2, letterSpacing: '-0.03em', color: theme.text }}>{currentItem?.label || 'Dashboard'}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {!mobileView && (
                <button
                  type="button"
                  className="sidebar-toggle-pill sidebar-toggle-header"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  onClick={() => {
                    const next = sidebarMode === 'expanded' ? 'compact' : sidebarMode === 'compact' ? 'collapsed' : 'expanded';
                    setSidebarModeAndWidth(next);
                  }}
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  style={{ padding: '0.62rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: `1px solid ${theme.cardBorder}`, background: 'var(--surface-elevated)' }}
                >
                  {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div className="admin-console-chip" title="System Administration Console">
                  <span className="admin-console-chip__dot" />
                  <span>SAC</span>
                </div>
                {!mobileView ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.24rem', borderRadius: 12, border: `1px solid ${theme.cardBorder}`, background: 'var(--surface-elevated)' }}>
                    <ThemeToggle />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
                  title="Toggle UI density"
                  style={{ padding: '0.55rem 0.7rem', borderRadius: 12, border: `1px solid ${theme.cardBorder}`, background: 'var(--surface-elevated)', cursor: 'pointer', fontWeight: 700, color: theme.text, fontSize: '0.8rem' }}
                >
                  {density === 'compact' ? 'Compact' : 'Comfortable'}
                </button>
              </div>
            </div>
          </header>

          <div style={{ flex: 1, marginTop: '1.25rem' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

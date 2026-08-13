import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChartNoAxesCombined, FileText, Gauge, Lock, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, Truck, UserCircle, Webhook, X } from 'lucide-react';

type SidebarMode = 'expanded' | 'compact' | 'collapsed';

function getInitialSidebarMode(storageKey: string): SidebarMode {
  if (typeof window === 'undefined') return 'expanded';

  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'expanded' || stored === 'compact' || stored === 'collapsed') {
    return stored;
  }

  const legacy = window.localStorage.getItem('client_sidebar_collapsed');
  if (legacy === 'true') return 'collapsed';
  if (legacy === 'false') return window.innerWidth < 1100 ? 'compact' : 'expanded';

  return window.innerWidth < 1100 ? 'compact' : 'expanded';
}
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/ToastProvider';
import Avatar from '../../components/ui/Avatar';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { fetchCompany } from '../../services/client';
import { resolveMediaUrl } from '../../utils/media';

const baseNavigationItems = [
  { to: '/client', label: 'Command Center', icon: Gauge },
  { to: '/client/deliveries', label: 'Delivery Operations', icon: Truck },
];

const managerNavigationItems = [
  { to: '/client/reports', label: 'Analytics & Insights', icon: ChartNoAxesCombined },
  { to: '/client/documents', label: 'Document Center', icon: FileText },
  { to: '/client/api-management', label: 'Developer & API Hub', icon: Webhook },
  { to: '/client/company', label: 'Organization Settings', icon: Building2 },
];

export function ClientLayout() {
  const auth = useAuth();
  const location = useLocation<{ alert?: string }>();
  const navigate = useNavigate();
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => getInitialSidebarMode('client_sidebar_mode'));
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedWidth = window.localStorage.getItem('client_sidebar_width');
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

  const setSidebarModeAndWidth = (nextMode: SidebarMode) => {
    setSidebarMode(nextMode);
    const width = defaultSidebarWidth(nextMode);
    setSidebarWidthValue(width);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('client_sidebar_width', String(width));
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
        window.localStorage.setItem('client_sidebar_width', String(nextWidth));
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

  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutConfirmClosing, setLogoutConfirmClosing] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  const isCompanyApproved = Boolean(
    auth.user?.company?.admin_verification_status === 'Verified' ||
    auth.user?.company?.approval_status === 'approved'
  );

  // Single source of truth: every color below is a shared theme variable
  // (see src/styles/app.css) so this layout stays visually identical to the
  // Admin Portal layout in both Light and Dark mode.
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
    surfaceElevated: 'var(--surface-elevated)',
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
    if (!mobileView) {
      setMobileOpen(false);
    }
  }, [mobileView]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileView && mobileOpen ? 'hidden' : '';
    document.documentElement.style.overflow = mobileView && mobileOpen ? 'hidden' : '';
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    };
  }, [mobileOpen, mobileView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('client_sidebar_mode', sidebarMode);
      window.localStorage.setItem('client_sidebar_collapsed', String(sidebarMode === 'collapsed'));
    } catch {
      // ignore local storage errors
    }
  }, [sidebarMode]);

  // Load the company's name once so it can be shown throughout the
  // client portal (sidebar brand), independent of which page is active.
  useEffect(() => {
    let mounted = true;
    fetchCompany()
      .then((company) => {
        if (!mounted) return;
        setCompanyName(company.name || null);
      })
      .catch(() => {
        // Silently ignore — fall back to the default brand name.
      });
    return () => { mounted = false; };
  }, []);

  const isCollapsed = sidebarMode === 'collapsed';
  const isCompact = sidebarMode === 'compact';
  const isExpanded = sidebarMode === 'expanded';
  const isDispatcherOnly = auth.hasRole('Company Dispatcher') && !auth.hasRole('Company Manager');
  const navigationItems = isDispatcherOnly ? baseNavigationItems : [...baseNavigationItems, ...managerNavigationItems];
  const modeOptions = useMemo(() => [
    { mode: 'expanded' as const, label: 'Expanded', short: 'Exp' },
    { mode: 'compact' as const, label: 'Compact', short: 'Cmp' },
    { mode: 'collapsed' as const, label: 'Collapsed', short: 'Cls' },
  ], []);

  const currentItem = useMemo(() => {
    return navigationItems.find((item) => location.pathname === item.to || (item.to !== '/client' && location.pathname.startsWith(item.to)));
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    if (!currentItem) {
      return [{ label: 'Organization Portal', to: '/client' }];
    }

    if (location.pathname === '/client') {
      return [{ label: 'Organization Portal', to: '/client' }];
    }

    return [{ label: 'Organization Portal', to: '/client' }, { label: currentItem.label }];
  }, [currentItem, location.pathname]);

  const handleNavigate = () => {
    if (mobileView) {
      setMobileOpen(false);
    }
  };

  const toast = useToast();

  function openLogoutConfirm() {
    setLogoutConfirmClosing(false);
    setShowLogoutConfirm(true);
  }

  function closeLogoutConfirm() {
    setLogoutConfirmClosing(true);
    window.setTimeout(() => {
      setShowLogoutConfirm(false);
      setLogoutConfirmClosing(false);
    }, 210);
  }

  async function performLogout() {
    setLoggingOut(true);
    try {
      await auth.logout();
      toast.success({
        title: 'Your session has been securely ended',
        description: 'Thank you for using Integrated Delivery Portal.',
      });
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
      closeLogoutConfirm();
    }
  }

  return (
    <div style={{ minHeight: '100vh', height: '100%', overflow: 'hidden', color: theme.text, background: theme.rootBg }}>
      {mobileView && mobileOpen ? <div className="layout-mobile-backdrop" onClick={() => setMobileOpen(false)} /> : null}
      {mobileView ? (
        <div className="layout-mobile-topbar" style={{ paddingLeft: 'calc(var(--safe-area-left, 0px) + 0.95rem)', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.02))' }}>
          <button type="button" className="layout-mobile-topbar__button" onClick={() => setMobileOpen((value) => !value)} aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <div className="layout-mobile-topbar__title">{currentItem?.label || 'Organization Portal'}</div>
          <div className="layout-mobile-topbar__actions">
            <ThemeToggle />
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
            padding: mobileView ? (mobileOpen ? '1.15rem 0.95rem' : '0') : isCollapsed ? '0.7rem 0.55rem' : isCompact ? '0.9rem 0.75rem' : '1.05rem 0.85rem',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
              {!isCollapsed ? (
                <div className="brand-copy" style={{ minWidth: 0, maxWidth: isCompact ? 140 : 220 }}>
                  <div className="brand-title" style={{ fontSize: isCompact ? '0.74rem' : '0.78rem' }}>{companyName || 'Client Portal'}</div>
                  {isExpanded ? <div className="brand-subtitle">Company Manager</div> : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="sidebar-toggle-pill"
              onClick={() => (mobileView ? setMobileOpen((value) => !value) : setSidebarModeAndWidth(sidebarMode === 'expanded' ? 'compact' : sidebarMode === 'compact' ? 'collapsed' : 'expanded'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (mobileView) setMobileOpen((v) => !v); else setSidebarModeAndWidth(sidebarMode === 'expanded' ? 'compact' : sidebarMode === 'compact' ? 'collapsed' : 'expanded');
                }
              }}
              aria-controls="client-sidebar-nav"
              aria-expanded={mobileView ? (mobileOpen ? 'true' : 'false') : (!isCollapsed).toString()}
              aria-label={mobileView ? (mobileOpen ? 'Close sidebar' : 'Open sidebar') : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${theme.sidebarBorder}`, background: theme.surfaceElevated, color: theme.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-soft)' }}
            >
              {mobileView ? (mobileOpen ? <X size={18} /> : <Menu size={18} />) : isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
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
              width: 12,
              cursor: mobileView ? 'default' : 'ew-resize',
              zIndex: 32,
            }}
          />

          <nav id="client-sidebar-nav" style={{ display: 'grid', gap: '0.4rem', paddingBottom: '1rem' }} aria-label="Client portal navigation" aria-hidden={mobileView && !mobileOpen}>
            {navigationItems.map((link) => {
              const isActive = location.pathname === link.to || (link.to !== '/client' && location.pathname.startsWith(link.to));
              const isApiMgmt = link.to === '/client/api-management';
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? 0 : '0.7rem',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    padding: isCollapsed ? '0.75rem' : '0.8rem 0.95rem',
                    borderRadius: 12,
                    color: isActive ? theme.navActiveText : theme.navInactiveText,
                    background: isActive ? theme.navActiveBg : 'transparent',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 180ms ease',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, opacity: isActive ? 1 : 0.9 }}>
                    {isApiMgmt && !isCompanyApproved ? (
                      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={15} strokeWidth={2} />
                      </span>
                    ) : (
                      <Icon size={18} strokeWidth={1.95} />
                    )}
                  </span>
                  {!isCollapsed ? <span className="nav-label">{link.label}{isApiMgmt && !isCompanyApproved ? ' (Pending Approval)' : ''}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div style={{ marginTop: 'auto', display: 'grid', gap: '0.7rem' }}>
            {!isCollapsed ? (
              <div style={{ padding: '0.85rem', borderRadius: 14, border: `1px solid ${theme.sidebarBorder}`, background: theme.surfaceElevated }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Avatar src={resolveMediaUrl(auth.user?.profile_photo)} name={auth.user?.name} size={40} />
                    <span aria-hidden="true" style={{ position: 'absolute', right: -2, bottom: -2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '999px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <UserCircle size={12} strokeWidth={2} />
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: theme.text }}>{auth.user?.name || 'Company Manager'}</div>
                    <div style={{ color: theme.muted, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{auth.user?.email}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="sidebar-profile-avatar"
                data-tooltip={auth.user?.name || 'Company Manager'}
                title={auth.user?.name || 'Company Manager'}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.25rem 0' }}
              >
                <Avatar src={resolveMediaUrl(auth.user?.profile_photo)} name={auth.user?.name} size={34} />
              </div>
            )}

            <button
              type="button"
              onClick={openLogoutConfirm}
              disabled={loggingOut}
              className={`logout-action ${isCollapsed ? 'logout-action--collapsed' : ''}`}
            >
              <LogOut size={15} />
              {!isCollapsed && <span>{loggingOut ? 'Signing out…' : 'Log out'}</span>}
            </button>
          </div>
        </div>
        </aside>

        <main className="layout-main" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', position: 'relative' }}>
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
              border: `1px solid ${theme.sidebarBorder}`,
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
              <h1 style={{ margin: '0.38rem 0 0', fontSize: mobileView ? '1.1rem' : '1.25rem', lineHeight: 1.2, letterSpacing: '-0.03em', color: theme.text }}>{currentItem?.label || 'Organization Portal'}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {!mobileView && (
                <button
                  type="button"
                  className="sidebar-toggle-pill sidebar-toggle-header"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  onClick={() => setSidebarModeAndWidth(sidebarMode === 'expanded' ? 'compact' : sidebarMode === 'compact' ? 'collapsed' : 'expanded')}
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  style={{ padding: '0.62rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: `1px solid ${theme.sidebarBorder}`, background: 'var(--surface-elevated)' }}
                >
                  {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div className="admin-console-chip" title="Client Portal">
                  <span className="admin-console-chip__dot" />
                  <span>CP</span>
                </div>
                {!mobileView ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.24rem', borderRadius: 12, border: `1px solid ${theme.sidebarBorder}`, background: 'var(--surface-elevated)' }}>
                    <ThemeToggle />
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div style={{ flex: 1, marginTop: '1.25rem' }}>
            <Outlet />
          </div>
        </main>

        {showLogoutConfirm ? (
          <div
            className={`client-logout-modal-overlay ${logoutConfirmClosing ? 'client-logout-modal-overlay--closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={() => {
              if (!loggingOut) closeLogoutConfirm();
            }}
          >
            <div
              className={`client-logout-modal-card ${logoutConfirmClosing ? 'client-logout-modal-card--closing' : ''}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="client-logout-modal__icon" aria-hidden="true">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--accent)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Secure Logout Confirmation</p>
                  <h2 id="logout-modal-title" style={{ margin: '0.55rem 0 0', fontSize: '1.85rem', lineHeight: 1.05, color: 'var(--text-primary)' }}>Confirm sign out</h2>
                </div>
              </div>

              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.8, fontSize: '0.98rem' }}>
                Are you sure you want to sign out from your Company Manager workspace?
                <br />
                Your active session will be securely closed and you will need to authenticate again to access your organization dashboard.
              </p>

              <div className="client-logout-modal__actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeLogoutConfirm}
                  disabled={loggingOut}
                  style={{ minWidth: 120 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={performLogout}
                  disabled={loggingOut}
                  aria-busy={loggingOut ? 'true' : undefined}
                  style={{ minWidth: 180 }}
                >
                  {loggingOut ? 'Signing out securely…' : 'Sign Out Securely'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ClientLayout;

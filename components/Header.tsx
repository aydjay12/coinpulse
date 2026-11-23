'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from './Logo';
import SearchModal from './SearchModal';
import NavLink from './NavLink';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';
import { User, LayoutDashboard, Wallet, PieChart, LogOut, Star, Menu, X } from 'lucide-react';
import './Header.css';

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth pages where header should be hidden
  const isAuthPage = [
    '/login',
    '/register',
    '/verify-otp',
    '/forgot-password',
    '/reset-password',
  ].includes(pathname);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsDropdownOpen(false);
      setIsMobileMenuOpen(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    const toastId = toast.loading('Logging out...');

    try {
      await logout();
      toast.success('Logged out successfully', { id: toastId });
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log out', { id: toastId });
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (isAuthPage) return null;

  return (
    <header className={`header ${isMobileMenuOpen ? 'mobile-menu-active' : ''}`}>
      <div className="header-container">
        <NavLink href="/" className="logo-link" loadingLabel="Loading market intelligence...">
          <Logo />
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="nav">
          {!isAuthenticated ? (
            <>
              <NavLink
                href="/"
                className={`nav-link ${pathname === '/' ? 'active' : ''}`}
                loadingLabel="Loading market intelligence..."
              >
                Home
              </NavLink>
              <NavLink
                href="/coins"
                className={`nav-link ${pathname === '/coins' ? 'active' : ''}`}
                loadingLabel="Loading asset explorer..."
              >
                All Coins
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                href="/dashboard"
                className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
                loadingLabel="Opening command center..."
              >
                Console
              </NavLink>
              <NavLink
                href="/coins"
                className={`nav-link ${pathname === '/coins' ? 'active' : ''}`}
                loadingLabel="Loading asset explorer..."
              >
                All Coins
              </NavLink>
              <NavLink
                href="/connect-wallet"
                className={`nav-link ${pathname === '/connect-wallet' ? 'active' : ''}`}
                loadingLabel="Loading wallet bridge..."
              >
                Connect Wallet
              </NavLink>
              <NavLink
                href="/portfolio"
                className={`nav-link ${pathname === '/portfolio' ? 'active' : ''}`}
                loadingLabel="Loading assets..."
              >
                Portfolio
              </NavLink>
            </>
          )}

          {/* Search is ALWAYS last */}
          <SearchModal />
        </nav>

        {/* Right Section: Auth & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <div className="mobile-search">
            <SearchModal enableShortcut={false} />
          </div>

          {!isAuthenticated ? (
            <div className="auth-nav-links">
              <NavLink href="/login" className="auth-btn auth-btn-login">
                Login
              </NavLink>
              <NavLink href="/register" className="auth-btn auth-btn-register">
                Register
              </NavLink>
            </div>
          ) : (
            <div className="profile-menu-container" ref={dropdownRef}>
              <button
                className="profile-trigger"
                onClick={toggleDropdown}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.username}
                    width={40}
                    height={40}
                    className="profile-avatar"
                    unoptimized={user.avatar.startsWith('data:')}
                  />
                ) : (
                  <div className="avatar-initial">{getInitials(user?.username || 'U')}</div>
                )}
              </button>

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-info">
                    <span className="dropdown-user-name">{user?.username}</span>
                    <span className="dropdown-user-email">{user?.email}</span>
                  </div>
                  <NavLink href="/profile" className="dropdown-item">
                    <User size={18} /> Profile
                  </NavLink>
                  <NavLink href="/watchlist" className="dropdown-item">
                    <Star size={18} /> Watchlist
                  </NavLink>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    className="dropdown-item logout"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="mobile-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay">
          <div className="mobile-nav-links">
            <p className="mobile-nav-section-title">Navigation</p>
            <NavLink href="/" className={`mobile-nav-link ${pathname === '/' ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink
              href="/coins"
              className={`mobile-nav-link ${pathname === '/coins' ? 'active' : ''}`}
            >
              All Coins
            </NavLink>

            {isAuthenticated && (
              <>
                <p className="mobile-nav-section-title" style={{ marginTop: '1rem' }}>
                  Market Intelligence
                </p>
                <NavLink
                  href="/dashboard"
                  className={`mobile-nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
                >
                  <LayoutDashboard size={20} /> Console
                </NavLink>
                <NavLink
                  href="/connect-wallet"
                  className={`mobile-nav-link ${pathname === '/connect-wallet' ? 'active' : ''}`}
                >
                  <Wallet size={20} /> Connect Wallet
                </NavLink>
                <NavLink
                  href="/portfolio"
                  className={`mobile-nav-link ${pathname === '/portfolio' ? 'active' : ''}`}
                >
                  <PieChart size={20} /> Portfolio
                </NavLink>
              </>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="mobile-auth-footer">
              <NavLink href="/login" className="auth-btn auth-btn-login" style={{ width: '100%' }}>
                Login
              </NavLink>
              <NavLink
                href="/register"
                className="auth-btn auth-btn-register"
                style={{ width: '100%' }}
              >
                Register
              </NavLink>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Log out?"
        description="You’ll be signed out of your Coinnex session on this device."
        confirmLabel="Logout"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          await handleLogout();
        }}
      />
    </header>
  );
};

export default Header;

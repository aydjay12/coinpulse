'use client';

import Link, { LinkProps } from 'next/link';
import { useNavigationLoading } from '@/components/NavigationLoadingProvider';
import { usePathname } from 'next/navigation';

type NavLinkProps = LinkProps &
  Omit<React.ComponentProps<typeof Link>, 'href'> & {
    loadingLabel?: string;
  };

const NavLink = ({ href, onClick, loadingLabel, children, ...props }: NavLinkProps) => {
  const { beginNavigation } = useNavigationLoading();
  const pathname = usePathname();

  const normalizePath = (path: string) => {
    const withoutHash = path.split('#')[0] ?? '';
    const withoutQuery = withoutHash.split('?')[0] ?? '';
    const trimmed = withoutQuery.replace(/\/+$/, '');
    return trimmed || '/';
  };

  const currentPath = normalizePath(pathname || '/');
  const targetPath =
    typeof href === 'string'
      ? normalizePath(href)
      : normalizePath(href.pathname?.toString() || '/');

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          if (targetPath === currentPath) {
            event.preventDefault();
            return;
          }
          beginNavigation(loadingLabel);
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );
};

export default NavLink;

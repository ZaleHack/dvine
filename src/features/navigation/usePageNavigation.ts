import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type AppPage =
  | 'login'
  | 'dashboard'
  | 'search'
  | 'call-analysis'
  | 'cdr'
  | 'cdr-case'
  | 'transaction-analysis'
  | 'requests'
  | 'profiles'
  | 'blacklist'
  | 'logs'
  | 'users'
  | 'upload';

export const pageToPath: Record<AppPage, string> = {
  login: '/login',
  dashboard: '/',
  search: '/recherche',
  'call-analysis': '/analyse-appels',
  'transaction-analysis': '/transactions',
  cdr: '/cdr',
  'cdr-case': '/cdr/dossier',
  requests: '/demandes',
  profiles: '/fiches-profil',
  blacklist: '/liste-blanche',
  logs: '/journaux',
  users: '/utilisateurs',
  upload: '/import'
};

const normalizePathname = (pathname: string) => {
  if (!pathname) return '/';
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

export const pathToPage = (pathname: string): AppPage => {
  const normalized = normalizePathname(pathname);
  const entry = (Object.entries(pageToPath) as [AppPage, string][]).find(([, path]) => path === normalized);
  return entry ? entry[0] : 'dashboard';
};

export const usePageNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = useMemo<AppPage>(() => pathToPage(location.pathname), [location.pathname]);

  const navigateToPage = useCallback(
    (page: AppPage, options?: { replace?: boolean }) => {
      const targetPath = pageToPath[page];
      if (!targetPath) return;
      navigate(targetPath, { replace: options?.replace });
    },
    [navigate]
  );

  return { currentPage, navigateToPage } as const;
};

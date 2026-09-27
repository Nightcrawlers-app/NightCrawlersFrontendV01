import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

interface PageNavProps {
  /** Where "Back" goes if there's no previous page (e.g. opened from a link). */
  fallback?: string;
  /**
   * floating (default): pinned to the top-left corner — for full-screen pages
   * like sign-in/sign-up that have no header. inline: sits in the page flow.
   */
  variant?: 'floating' | 'inline';
  /** Hide "Back" (e.g. on dashboards, where back would lead to the login page). */
  showBack?: boolean;
}

/**
 * "← Back · Home" for pages without the main site header (sign-in, sign-up,
 * password reset, KYC, admin login), so nobody gets stuck on them.
 */
const PageNav: React.FC<PageNavProps> = ({ fallback = '/', variant = 'floating', showBack = true }) => {
  const navigate = useNavigate();

  // React Router keeps a history index; 0 means this is the first page they
  // opened in this tab, so "back" would leave the site — go to the fallback.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback);
  };

  const position =
    variant === 'floating'
      ? 'fixed left-3 z-50 top-[max(0.75rem,env(safe-area-inset-top))] sm:left-5 sm:top-5'
      : 'relative';

  return (
    <nav
      aria-label="Page navigation"
      className={`${position} inline-flex items-center rounded-full bg-white/95 backdrop-blur border border-gray-200 shadow-sm text-[13px] font-medium text-gray-700 font-poppins`}
    >
      {showBack && (
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-l-full hover:bg-gray-50 hover:text-[#C62222] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C62222]/40"
      >
        <ChevronLeft size={16} /> Back
      </button>
      )}
      {showBack && <span className="h-4 w-px bg-gray-200" aria-hidden="true" />}
      <Link
        to="/"
        className={`inline-flex items-center gap-1.5 pl-3 pr-3.5 py-1.5 ${showBack ? 'rounded-r-full' : 'rounded-full'} hover:bg-gray-50 hover:text-[#C62222] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C62222]/40`}
      >
        <Home size={14} /> Home
      </Link>
    </nav>
  );
};

export default PageNav;

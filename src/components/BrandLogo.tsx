import React from 'react';

interface BrandLogoProps {
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-200">
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
          <path
            d="M6 6h11c5.523 0 10 4.477 10 10s-4.477 10-10 10H6V6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 11h9c2.761 0 5 2.239 5 5s-2.239 5-5 5H6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="16" r="2" fill="currentColor" />
        </svg>
      </div>
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.55em] text-rose-500">Dvine</p>
        <p className="text-lg font-semibold tracking-[0.2em] text-slate-900">Intelligence</p>
      </div>
    </div>
  );
};

export default BrandLogo;

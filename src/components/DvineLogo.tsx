import React from 'react';

interface DvineLogoProps {
  className?: string;
}

const DvineLogo: React.FC<DvineLogoProps> = ({ className }) => (
  <svg
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Logo Dvine Intelligence"
    className={className}
  >
    <defs>
      <linearGradient id="dvine-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fee2e2" />
        <stop offset="40%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="112" height="112" rx="32" fill="url(#dvine-gradient)" />
    <path
      d="M40 86c18 0 36-14 36-32S72 22 54 22H34v76h12"
      fill="none"
      stroke="#fff"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="80" cy="40" r="12" fill="#fff" opacity="0.85" />
    <circle cx="88" cy="78" r="8" fill="#fff" opacity="0.7" />
  </svg>
);

export default DvineLogo;

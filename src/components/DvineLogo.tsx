import React from 'react';

interface DvineLogoProps {
  className?: string;
}

const DvineLogo: React.FC<DvineLogoProps> = ({ className }) => (
  <svg
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Dvine Intelligence logo"
    className={className}
  >
    <defs>
      <linearGradient id="dvineGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="40%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
      <radialGradient id="dvineCore" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="60%" stopColor="#fecdd3" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x="8" y="8" width="104" height="104" rx="24" fill="#0f0f11" />
    <rect x="16" y="16" width="88" height="88" rx="20" fill="url(#dvineCore)" />
    <path
      d="M34 86V34h16c16 0 26 8.5 26 24 0 15-10 28-26 28H34z"
      fill="none"
      stroke="url(#dvineGlow)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M52 86c10-4 18-13 18-28 0-11-4.5-17.5-10.5-21"
      fill="none"
      stroke="url(#dvineGlow)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
    <circle cx="48" cy="42" r="6" fill="#fff" />
    <circle cx="72" cy="62" r="6" fill="#fff" />
  </svg>
);

export default DvineLogo;

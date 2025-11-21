import React from 'react';

interface DvineLogoProps {
  className?: string;
}

const DvineLogo: React.FC<DvineLogoProps> = ({ className }) => (
  <svg
    viewBox="0 0 140 140"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Dvine Intelligence logo"
    className={className}
  >
    <defs>
      <linearGradient id="dvineCrimson" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#fb923c" />
      </linearGradient>
      <linearGradient id="dvineCarbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="50%" stopColor="#111827" />
        <stop offset="100%" stopColor="#0b0f1c" />
      </linearGradient>
      <radialGradient id="dvineHalo" cx="50%" cy="38%" r="70%">
        <stop offset="0%" stopColor="#fef2f2" stopOpacity="0.95" />
        <stop offset="60%" stopColor="#fecaca" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
      </radialGradient>
      <filter id="dvineShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#e11d48" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="10" width="120" height="120" rx="28" fill="url(#dvineCarbon)" />
    <rect x="18" y="18" width="104" height="104" rx="24" fill="url(#dvineHalo)" opacity="0.95" />
    <g filter="url(#dvineShadow)">
      <path
        d="M44 32h30c24 0 42 16.5 42 46s-18 46-42 46H44c-7.5 0-12-4.6-12-12.5V44.5C32 36.6 36.5 32 44 32z"
        fill="none"
        stroke="url(#dvineCrimson)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 48h18c14.5 0 26 9.2 26 29 0 19-11.5 29-26 29H52"
        fill="none"
        stroke="url(#dvineCrimson)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M56 70c6-7 13.5-10 22-7.5"
        fill="none"
        stroke="#fb7185"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      <circle cx="60" cy="46" r="8" fill="#fff" />
      <circle cx="92" cy="74" r="9" fill="#fff" fillOpacity="0.95" />
    </g>
  </svg>
);

export default DvineLogo;

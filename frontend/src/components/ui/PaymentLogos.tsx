import React from 'react';

export const WaveLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect width="100" height="100" rx="22" fill="#1EA7FD" />
    {/* Pingouin Wave */}
    <ellipse cx="50" cy="58" rx="24" ry="26" fill="#0A1E3F" />
    <ellipse cx="50" cy="60" rx="16" ry="20" fill="#FFFFFF" />
    <circle cx="50" cy="30" r="15" fill="#0A1E3F" />
    <ellipse cx="45" cy="28" rx="2.5" ry="3.5" fill="#FFFFFF" />
    <circle cx="45.5" cy="28" r="1.5" fill="#0A1E3F" />
    <polygon points="50,31 62,36 50,39" fill="#FFB703" />
    <path d="M26 56 C24 64, 30 72, 34 70 C36 64, 34 58, 32 54 Z" fill="#0A1E3F" />
    <path d="M74 56 C76 64, 70 72, 66 70 C64 64, 66 58, 68 54 Z" fill="#0A1E3F" />
    <ellipse cx="42" cy="85" rx="7" ry="3.5" fill="#FFB703" />
    <ellipse cx="58" cy="85" rx="7" ry="3.5" fill="#FFB703" />
  </svg>
);

export const OrangeMoneyLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect width="100" height="100" rx="22" fill="#FF7900" />
    <rect x="14" y="14" width="72" height="72" rx="16" fill="#000000" />
    {/* Cercles imbriqués Orange Money */}
    <circle cx="43" cy="46" r="18" fill="#FF7900" />
    <circle cx="57" cy="46" r="18" fill="#FFFFFF" fillOpacity="0.88" />
    <circle cx="50" cy="46" r="11" fill="#FF7900" fillOpacity="0.8" />
    <text
      x="50"
      y="76"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="10"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="1"
    >
      MONEY
    </text>
  </svg>
);

export const MtnLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect width="100" height="100" rx="22" fill="#FFCC00" />
    {/* Ovale MTN signature */}
    <ellipse cx="50" cy="48" rx="38" ry="25" fill="#FFCC00" stroke="#000000" strokeWidth="6" />
    <text
      x="50"
      y="55"
      textAnchor="middle"
      fill="#000000"
      fontSize="20"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontStyle="italic"
      letterSpacing="1"
    >
      MTN
    </text>
    <text
      x="50"
      y="84"
      textAnchor="middle"
      fill="#000000"
      fontSize="9"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="0.8"
    >
      MoMo
    </text>
  </svg>
);

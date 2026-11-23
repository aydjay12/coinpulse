import React from 'react';

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <defs>
          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="ringBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="ringPurple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
        </defs>

        {/* Orbit Blue */}
        <ellipse
          cx="50"
          cy="50"
          rx="45"
          ry="15"
          stroke="url(#ringBlue)"
          strokeWidth="3"
          transform="rotate(-45 50 50)"
          strokeLinecap="round"
        />

        {/* Orbit Purple */}
        <ellipse
          cx="50"
          cy="50"
          rx="45"
          ry="15"
          stroke="url(#ringPurple)"
          strokeWidth="3"
          transform="rotate(45 50 50)"
          strokeLinecap="round"
        />

        {/* Coin */}
        <circle cx="50" cy="50" r="22" fill="url(#coinGrad)" />
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fill="white"
          fontSize="24"
          fontWeight="bold"
          fontFamily="Arial"
        >
          C
        </text>

        {/* Stars */}
        <circle cx="15" cy="20" r="2" fill="#FFD700" className="animate-pulse" />
        <circle cx="85" cy="30" r="1.5" fill="#FFD700" className="animate-pulse" />
        <circle cx="80" cy="80" r="1" fill="#FFD700" className="animate-pulse" />
      </svg>
      <span className="text-2xl font-bold tracking-tight brand-gradient-text leading-none">
        Coinnex
      </span>
    </div>
  );
};

export default Logo;

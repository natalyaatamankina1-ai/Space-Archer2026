import React from 'react';

export function SpaceCoreIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block ${className}`} style={{ filter: 'drop-shadow(0 0 8px rgba(191,0,255,0.8))' }}>
      <defs>
        <linearGradient id="core-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff">
            <animate attributeName="stop-color" values="#00ffff;#bf00ff;#ff006e;#00ffff" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#bf00ff">
            <animate attributeName="stop-color" values="#bf00ff;#ff006e;#00ffff;#bf00ff" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#bf00ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#bf00ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Outer rotating ring */}
      <circle cx="12" cy="12" r="10" fill="none" stroke="url(#core-grad)" strokeWidth="1.5" strokeDasharray="15 10" className="origin-center" style={{ animation: 'spin 4s linear infinite' }} />
      
      {/* Inner rotating ring (opposite direction) */}
      <circle cx="12" cy="12" r="7" fill="none" stroke="url(#core-grad)" strokeWidth="1" strokeDasharray="8 6" className="origin-center" style={{ animation: 'spin 3s linear infinite reverse' }} />
      
      {/* Core glow */}
      <circle cx="12" cy="12" r="5" fill="url(#core-glow)" className="animate-pulse" style={{ animationDuration: '2s' }} />
      
      {/* Center star */}
      <path d="M12 5 L13.5 10.5 L19 12 L13.5 13.5 L12 19 L10.5 13.5 L5 12 L10.5 10.5 Z" fill="#ffffff" className="animate-pulse" style={{ animationDuration: '1.5s' }} />
    </svg>
  );
}

'use client';

interface LogoProps {
  className?: string;
}

/** Isotipo unificado: bolsa de mercadito en verde marca. */
export default function Logo({ className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className || 'w-11 h-11 sm:w-12 sm:h-12'}`}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#22C55E" />
      <path
        d="M22 28c0-8 6.5-13 10-13s10 5 10 13"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <rect x="16" y="27" width="32" height="25" rx="6" fill="#FFFFFF" />
      <rect x="28" y="36" width="8" height="16" rx="2" fill="#059669" />
    </svg>
  );
}

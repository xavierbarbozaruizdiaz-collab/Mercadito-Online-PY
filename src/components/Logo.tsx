'use client';

interface LogoProps {
  className?: string;
}

/** Isotipo moderno: tienda con toldo en verde menta (marca 2026). */
export default function Logo({ className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mercadito-logo-grad" x1="8" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#mercadito-logo-grad)" />
      {/* Toldo */}
      <path
        d="M8 17h24l-2.5-5.5a2 2 0 0 0-1.8-1.1H12.3a2 2 0 0 0-1.8 1.1L8 17z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Fachada */}
      <rect x="11" y="17" width="18" height="14" rx="2" fill="white" fillOpacity="0.95" />
      {/* Puerta */}
      <rect x="17" y="22" width="6" height="9" rx="1" fill="#059669" fillOpacity="0.85" />
      {/* Ventana */}
      <rect x="12.5" y="19.5" width="4" height="3.5" rx="0.75" fill="#D1FAE5" />
      <rect x="23.5" y="19.5" width="4" height="3.5" rx="0.75" fill="#D1FAE5" />
    </svg>
  );
}

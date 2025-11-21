'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlarmClock, Circle } from 'lucide-react';
import { getSyncedNow } from '@/lib/utils/timeSync';

type AuctionTimerProps = {
  /** Fecha/hora de cierre (ms epoch) enviada por el servidor */
  endAtMs: number;
  /** Marca de tiempo del servidor "ahora" (ms epoch) cuando se montó el componente */
  serverNowMs: number;
  /** Callback cuando llega a 0 */
  onExpire?: () => void;
  /** Opcional: reinicio visual al detectar nueva puja (anti-sniping) */
  lastBidAtMs?: number; // cambia este valor cuando entra una nueva puja para disparar animación
  /** Apariencia: 'full' (detalle) o 'compact' (listado) */
  variant?: 'full' | 'compact';
  /** Tamaño: 'md' por defecto, 'lg' para héroe del lote */
  size?: 'md' | 'lg';
  /** Intervalo de tick en ms */
  tickMs?: number;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatHMS(totalMs: number) {
  const total = Math.max(0, Math.floor(totalMs / 1000));
  
  // Si es mayor a 24 horas, mostrar días
  const hours24 = 24 * 60 * 60; // 86400 segundos
  if (total >= hours24) {
    const days = Math.floor(total / hours24);
    const remainingSeconds = total % hours24;
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    return `${days}d ${pad2(hours)}:${pad2(minutes)}`;
  }
  
  // Formato normal para menos de 24 horas: HH:MM:SS o MM:SS
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  
  // Si hay horas, mostrar HH:MM:SS, sino MM:SS
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export default function AuctionTimer({
  endAtMs,
  serverNowMs,
  onExpire,
  lastBidAtMs,
  variant = 'full',
  size = 'md',
  tickMs = 200,
}: AuctionTimerProps) {
  // Usar getSyncedNow() que calcula tiempo sincronizado con el servidor
  // Este tiempo se actualiza automáticamente cuando timeSync recalcula el offset
  const [nowMs, setNowMs] = useState<number>(getSyncedNow());

  // Para animación cuando entra nueva puja
  const [justReset, setJustReset] = useState<boolean>(false);
  const prevLastBidRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (lastBidAtMs && prevLastBidRef.current !== lastBidAtMs) {
      prevLastBidRef.current = lastBidAtMs;
      setJustReset(true);
      const t = setTimeout(() => setJustReset(false), 600);
      return () => clearTimeout(t);
    }
  }, [lastBidAtMs]);

  // Actualizar tiempo cada tick usando getSyncedNow()
  // Esto garantiza que si el offset se recalcula, el timer se actualiza automáticamente
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(getSyncedNow());
    }, tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);

  // Tiempo actual sincronizado con el servidor
  // getSyncedNow() usa el offset que se recalcula periódicamente
  const officialNowMs = useMemo(() => {
    return nowMs; // Ya viene sincronizado de getSyncedNow()
  }, [nowMs]);

  const remainingMs = Math.max(0, endAtMs - officialNowMs);

  const danger = remainingMs <= 3000; // Últimos 3 segundos - crítico
  const warning = remainingMs > 3000 && remainingMs <= 10000; // Últimos 10 segundos
  const ended = remainingMs <= 0;

  // Efecto de sonido para tiempo crítico
  useEffect(() => {
    if (danger && remainingMs > 0 && remainingMs <= 3000) {
      // Reproducir tick cada segundo cuando queda poco tiempo
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      } catch (e) {
        // Silenciosamente fallar si no se puede reproducir sonido
      }
    }
  }, [danger, remainingMs]);

  useEffect(() => {
    if (ended && onExpire) onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const label = ended ? 'Finalizado' : danger ? '¡ÚLTIMA OPORTUNIDAD!' : warning ? 'Última llamada' : 'En vivo';

  const timeStr = ended ? '00:00' : formatHMS(remainingMs);

  // Progreso 0..1 para ring/barra
  const totalWindowMs = 10000; // ventana visual (como Copart ~10s)
  const progress = ended ? 0 : Math.min(1, remainingMs / totalWindowMs);

  const sizeClasses =
    size === 'lg'
      ? { time: 'text-5xl', badge: 'text-sm px-3 py-1.5', ring: 120, stroke: 10 }
      : { time: 'text-3xl', badge: 'text-xs px-2 py-1', ring: 88, stroke: 8 };

  const statusColors = ended
    ? { base: 'bg-muted text-muted-foreground', ring: 'stroke-neutral-300' }
    : danger
    ? { base: 'bg-red-100 text-red-900 border-2 border-red-500 animate-pulse', ring: 'stroke-red-600' }
    : warning
    ? { base: 'bg-amber-100 text-amber-900 border border-amber-400', ring: 'stroke-amber-500' }
    : { base: 'bg-emerald-100 text-emerald-800 border border-emerald-300', ring: 'stroke-emerald-500' };

  return (
    <div
      className={cn(
        'relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300',
        'bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        justReset && !ended && 'animate-[pulse_0.6s_ease-out_1] border-emerald-300 shadow-lg',
        danger && !ended && 'animate-shake border-red-500 shadow-red-500/50 shadow-2xl',
        warning && !ended && 'animate-pulse-glow'
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Tiempo restante: ${timeStr}. Estado: ${label}`}
    >
      {/* Indicador circular */}
      <ProgressRing
        size={sizeClasses.ring}
        stroke={sizeClasses.stroke}
        progress={progress}
        ended={ended}
        className={statusColors.ring}
      />

      {/* Centro: tiempo + badge */}
      <div className="flex flex-col">
        <div
          className={cn(
            'font-mono tabular-nums leading-none',
            sizeClasses.time,
            ended ? 'text-foreground/50' : 'text-foreground'
          )}
        >
          {timeStr}
        </div>
        <div
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full',
            'font-medium uppercase tracking-wide',
            sizeClasses.badge,
            statusColors.base
          )}
        >
          {!ended && <Circle className={cn('size-3', danger ? 'animate-ping' : 'opacity-90')} />}
          {!ended && <Circle className="size-3 -ml-3" />}
          <span className="inline-flex items-center gap-1">
            <AlarmClock className="size-4" />
            {label}
          </span>
        </div>
      </div>

      {/* Barra inferior (para vista full) */}
      {variant === 'full' && (
        <div className="absolute left-0 right-0 bottom-0">
          <div className="h-1.5 w-full bg-muted/60">
            <div
              className={cn(
                'h-1.5 transition-[width] duration-150 ease-linear',
                ended
                  ? 'w-0 bg-neutral-300'
                  : danger
                  ? 'bg-red-500'
                  : warning
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRing({
  size,
  stroke,
  progress,
  ended,
  className,
}: {
  size: number;
  stroke: number;
  progress: number;
  ended: boolean;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      className={cn('shrink-0', ended ? 'opacity-60' : 'opacity-100')}
      aria-hidden
    >
      <circle
        stroke="currentColor"
        className="text-muted-foreground/20"
        strokeWidth={stroke}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke="currentColor"
        className={cn('transition-[stroke-dashoffset] duration-150 ease-linear', className)}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  );
}


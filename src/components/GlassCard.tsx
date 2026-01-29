import { cn } from '@/lib/utils';
import { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function GlassCard({ children, className, glow = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-md',
        glow && 'shadow-[var(--shadow-md),var(--glow-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

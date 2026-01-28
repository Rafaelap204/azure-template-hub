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
        'rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg',
        glow && 'shadow-[var(--glow-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

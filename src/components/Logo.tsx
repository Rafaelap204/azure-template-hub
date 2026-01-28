import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-lg bg-primary/30 blur-lg" />
        <div className={cn(
          'relative font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent',
          sizes[size]
        )}>
          CTU
        </div>
      </div>
      {size !== 'sm' && (
        <span className="text-sm text-muted-foreground font-medium">
          Template Utility
        </span>
      )}
    </div>
  );
}

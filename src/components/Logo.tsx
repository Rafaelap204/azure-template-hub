import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const config = {
    sm: { image: 'h-7 w-7', text: 'text-base', gap: 'gap-2' },
    md: { image: 'h-8 w-8', text: 'text-lg', gap: 'gap-2.5' },
    lg: { image: 'h-14 w-14', text: 'text-3xl', gap: 'gap-3' },
  };

  return (
    <div className={cn('flex items-center', config[size].gap, className)}>
      <a href="https://imgbb.com/" target="_blank" rel="noreferrer" className="shrink-0">
        <img
          src="https://i.ibb.co/jZhvsgzC/Design-sem-nome-2026-01-28-T140451-007-removebg-preview.png"
          alt="Design sem nome 2026 01 28T140451 007 removebg preview"
          className={cn('block border-0 object-contain', config[size].image)}
          decoding="async"
          loading="eager"
          onError={(e) => {
            e.currentTarget.src = '/brand/agentectu-logo.png';
          }}
        />
      </a>
      <span className={cn('font-display font-semibold tracking-tight text-foreground leading-none whitespace-nowrap', config[size].text)}>
        AgenteCTU
      </span>
    </div>
  );
}

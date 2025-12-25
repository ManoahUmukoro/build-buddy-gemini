import lifeosLogo from '@/assets/lifeos-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 20, text: 'text-sm' },
  md: { icon: 28, text: 'text-lg' },
  lg: { icon: 36, text: 'text-xl' },
  xl: { icon: 48, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo with 3D effect via drop shadow and gradient overlay */}
      <div 
        className="relative flex-shrink-0"
        style={{ 
          width: icon, 
          height: icon,
          filter: 'drop-shadow(2px 2px 4px rgba(79, 70, 229, 0.3))'
        }}
      >
        <img 
          src={lifeosLogo} 
          alt="LifeOS" 
          className="w-full h-full object-contain dark:brightness-110 dark:contrast-110"
          style={{
            filter: 'saturate(1.1)'
          }}
        />
        {/* 3D depth overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/10 rounded-full pointer-events-none"
          style={{ mixBlendMode: 'overlay' }}
        />
      </div>
      
      {showText && (
        <span className={`font-bold tracking-tight ${text} text-foreground`}>
          LifeOS
        </span>
      )}
    </div>
  );
}

// SVG Icon version for places where we need vector graphics
export function LogoIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center hexagon */}
      <polygon
        points="50,20 75,35 75,65 50,80 25,65 25,35"
        className="fill-primary dark:fill-primary"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
      />
      
      {/* Connection nodes - outer hexagons */}
      {/* Top */}
      <circle cx="50" cy="8" r="5" className="fill-muted-foreground/60 dark:fill-muted-foreground/80" />
      <line x1="50" y1="20" x2="50" y2="13" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Top-right */}
      <circle cx="82" cy="25" r="5" className="fill-muted-foreground/60 dark:fill-muted-foreground/80" />
      <line x1="75" y1="35" x2="78" y2="28" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Right-top */}
      <circle cx="90" cy="42" r="4" className="fill-primary/80" />
      <line x1="75" y1="45" x2="86" y2="42" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Right-bottom */}
      <circle cx="90" cy="58" r="4" className="fill-muted-foreground/60 dark:fill-muted-foreground/80" />
      <line x1="75" y1="55" x2="86" y2="58" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Bottom-right */}
      <circle cx="82" cy="75" r="5" className="fill-primary/80" />
      <line x1="75" y1="65" x2="78" y2="72" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Bottom */}
      <circle cx="50" cy="92" r="5" className="fill-muted-foreground/60 dark:fill-muted-foreground/80" />
      <line x1="50" y1="80" x2="50" y2="87" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Bottom-left */}
      <circle cx="18" cy="75" r="5" className="fill-muted-foreground/60 dark:fill-muted-foreground/80" />
      <line x1="25" y1="65" x2="22" y2="72" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Left-bottom */}
      <circle cx="10" cy="58" r="4" className="fill-primary/80" />
      <line x1="25" y1="55" x2="14" y2="58" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Left-top */}
      <circle cx="10" cy="42" r="4" className="fill-muted-foreground/60 dark:fill-muted-foreground/80" />
      <line x1="25" y1="45" x2="14" y2="42" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* Top-left */}
      <circle cx="18" cy="25" r="5" className="fill-primary/80" />
      <line x1="25" y1="35" x2="22" y2="28" className="stroke-muted-foreground/40 dark:stroke-muted-foreground/60" strokeWidth="1.5" />
      
      {/* 3D highlight on center */}
      <polygon
        points="50,24 72,37 72,50 50,50 28,50 28,37"
        fill="url(#highlight)"
        opacity="0.3"
      />
      
      <defs>
        <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

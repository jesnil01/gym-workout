import { useEffect, useState } from 'react';

interface AnimatedTitleProps {
  fontFamily?: string;
  label?: string;
  color?: string;
}

export function AnimatedTitle({ fontFamily = "'Poppins', sans-serif", label, color }: AnimatedTitleProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center relative mb-12">
      {label && (
        <div className="text-xs text-muted-foreground mb-2">{label}</div>
      )}
      <div
        className={`transition-all duration-3000 ease-out relative z-10 ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        }`}
      >
        <h1
          className="text-6xl md:text-7xl font-extrabold tracking-tighter animated-gradient-text"
          style={{
            fontFamily: fontFamily,
            opacity: 0.6,
            animation: 'text-glow 6s ease-in-out infinite',
          }}
        >
          Gym Workout
        </h1>
      </div>
      
      {/* Animated background glow effect */}
      <div 
        className="absolute inset-0 -z-0 blur-3xl opacity-30"
        style={{
          background: color === 'white' 
            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, transparent 70%)'
            : 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          animation: 'glow-pulse 6s ease-in-out infinite',
        }}
      />
      
      <style>{`
        .animated-gradient-text {
          background: linear-gradient(135deg, #93C5FD 0%, #A7F3D0 25%, #C4B5FD 50%, #FBBF24 75%, #93C5FD 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          animation: gradient-shift 8s ease infinite, text-glow 6s ease-in-out infinite;
        }
        
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        @keyframes text-glow {
          0%, 100% {
            filter: brightness(1);
            transform: scale(1);
          }
          50% {
            filter: brightness(1.2);
            transform: scale(1.02);
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.1);
          }
        }
        
        h1 span {
          display: inline-block;
          animation: letter-bounce 4s ease-in-out infinite;
        }
        
        h1 span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        @keyframes letter-bounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(1deg);
          }
        }
      `}</style>
    </div>
  );
}

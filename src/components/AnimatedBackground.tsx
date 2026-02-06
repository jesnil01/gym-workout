import { useEffect, useRef } from 'react';
import { useTheme } from './theme-provider';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Gradient mesh configuration
    const numPoints = 4;
    const points: Array<{ x: number; y: number; vx: number; vy: number; color: string }> = [];
    
    // Colors based on theme - subtle and smooth
    const lightColors = [
      'rgba(147, 197, 253, 0.4)', // blue-300
      'rgba(167, 243, 208, 0.4)', // green-300
      'rgba(196, 181, 253, 0.4)', // purple-300
      'rgba(251, 191, 36, 0.3)',   // amber-300
    ];
    
    const darkColors = [
      'rgba(59, 130, 246, 0.25)',  // blue-500
      'rgba(34, 197, 94, 0.25)',   // green-500
      'rgba(168, 85, 247, 0.25)',  // purple-500
      'rgba(245, 158, 11, 0.2)',  // amber-500
    ];
    
    const colors = theme === 'dark' ? darkColors : lightColors;

    // Initialize points
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color: colors[i % colors.length],
      });
    }

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update point positions
      points.forEach((point) => {
        point.x += point.vx;
        point.y += point.vy;

        // Bounce off edges
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1;

        // Keep within bounds
        point.x = Math.max(0, Math.min(canvas.width, point.x));
        point.y = Math.max(0, Math.min(canvas.height, point.y));
      });

      // Create gradient mesh using radial gradients with larger radius
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;
      
      const gradient1 = ctx.createRadialGradient(
        points[0].x,
        points[0].y,
        0,
        points[0].x,
        points[0].y,
        maxRadius
      );
      gradient1.addColorStop(0, points[0].color);
      gradient1.addColorStop(0.7, points[0].color.replace(/[\d.]+\)$/, '0.1)'));
      gradient1.addColorStop(1, 'transparent');

      const gradient2 = ctx.createRadialGradient(
        points[1].x,
        points[1].y,
        0,
        points[1].x,
        points[1].y,
        maxRadius * 0.9
      );
      gradient2.addColorStop(0, points[1].color);
      gradient2.addColorStop(0.7, points[1].color.replace(/[\d.]+\)$/, '0.1)'));
      gradient2.addColorStop(1, 'transparent');

      const gradient3 = ctx.createRadialGradient(
        points[2].x,
        points[2].y,
        0,
        points[2].x,
        points[2].y,
        maxRadius * 0.85
      );
      gradient3.addColorStop(0, points[2].color);
      gradient3.addColorStop(0.7, points[2].color.replace(/[\d.]+\)$/, '0.1)'));
      gradient3.addColorStop(1, 'transparent');

      const gradient4 = ctx.createRadialGradient(
        points[3].x,
        points[3].y,
        0,
        points[3].x,
        points[3].y,
        maxRadius * 0.95
      );
      gradient4.addColorStop(0, points[3].color);
      gradient4.addColorStop(0.7, points[3].color.replace(/[\d.]+\)$/, '0.1)'));
      gradient4.addColorStop(1, 'transparent');

      // Draw gradients - use lighter blend for dark mode, normal for light mode
      if (theme === 'dark') {
        ctx.globalCompositeOperation = 'screen';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
      
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = gradient4;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add vertical fade-out gradient mask (fade from top to bottom)
      const fadeGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
      fadeGradient.addColorStop(0, 'transparent');
      fadeGradient.addColorStop(1, theme === 'dark' ? 'rgba(13, 17, 23, 1)' : 'rgba(255, 255, 255, 1)');
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fadeGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}

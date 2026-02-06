import { useState, useEffect } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { getCompletedSessions } from '../lib/workoutStats';
import { getWorkoutStatus, getWorkoutMessage } from '../lib/workoutMessages';
import { getMockCompletedSessions } from '../lib/mockData';

interface WorkoutSubtitleProps {
  fontFamily?: string;
  color?: string;
}

export function WorkoutSubtitle({ fontFamily = "'Poppins', sans-serif", color }: WorkoutSubtitleProps) {
  const { dbReady, getAllLogs } = useIndexedDB();
  const [message, setMessage] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  
  const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

  useEffect(() => {
    if (!dbReady && !useMockData) {
      return;
    }

    const loadMessage = async () => {
      try {
        let completedSessions;
        
        if (useMockData) {
          completedSessions = getMockCompletedSessions();
        } else {
          const allLogs = await getAllLogs();
          completedSessions = getCompletedSessions(allLogs);
        }
        
        const status = getWorkoutStatus(completedSessions);
        const newMessage = getWorkoutMessage(status, completedSessions.length);
        
        // Fade out, update message, then fade in
        setIsVisible(false);
        setTimeout(() => {
          setMessage(newMessage);
          setIsVisible(true);
        }, 200);
      } catch (error) {
        console.error('Failed to load workout message:', error);
        setMessage('');
      }
    };

    loadMessage();
  }, [dbReady, getAllLogs, useMockData]);

  // Initial visibility animation
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div className="text-center relative mb-20 mt-12">
      <div
        className={`transition-all duration-3000 ease-out relative z-10 ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        }`}
      >
        <h1
          className="text-6xl md:text-7xl font-extrabold tracking-tighter animated-gradient-text"
          style={{
            fontFamily: fontFamily,
            opacity: 0.85,
            animation: 'text-glow 6s ease-in-out infinite',
            textShadow: '0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(168, 85, 247, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
            lineHeight: '1.1',
            paddingBottom: '0.2em',
            overflow: 'visible',
          }}
        >
          {message}
        </h1>
      </div>
      
      {/* Animated background glow effect */}
      <div 
        className="absolute inset-0 -z-0 blur-3xl opacity-50"
        style={{
          background: color === 'white' 
            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, transparent 70%)'
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
            filter: brightness(1) drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
            transform: scale(1);
          }
          50% {
            filter: brightness(1.3) drop-shadow(0 0 30px rgba(168, 85, 247, 0.6));
            transform: scale(1.03);
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.15);
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

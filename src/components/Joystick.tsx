import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  label?: string;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useRef({ x: 0, y: 0 }).current; // Use ref for logic, state for render if needed, but direct DOM manipulation is faster for 60fps
  const [visualPos, setVisualPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const touchId = useRef<number | null>(null);

  const radius = 40; // Max distance from center

  const handleStart = (clientX: number, clientY: number, id: number) => {
    if (touchId.current !== null) return;
    touchId.current = id;
    setActive(true);
    updatePosition(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    updatePosition(clientX, clientY);
  };

  const handleEnd = () => {
    touchId.current = null;
    setActive(false);
    setVisualPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * radius;
      dy = Math.sin(angle) * radius;
    }

    setVisualPos({ x: dx, y: dy });

    // Normalize to -1 to 1
    const normX = parseFloat((dx / radius).toFixed(2));
    const normY = parseFloat((dy / radius).toFixed(2));
    
    onMove(normX, normY);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-24 h-24 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm touch-none flex items-center justify-center"
      onPointerDown={(e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY, e.pointerId);
        (e.target as Element).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (active && e.pointerId === touchId.current) {
          e.preventDefault();
          handleMove(e.clientX, e.clientY);
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerId === touchId.current) {
          e.preventDefault();
          handleEnd();
          (e.target as Element).releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === touchId.current) {
          handleEnd();
        }
      }}
    >
      {/* Stick Head */}
      <div 
        className={`absolute w-10 h-10 rounded-full shadow-lg transition-transform duration-75 ${active ? 'bg-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-white/20'}`}
        style={{ 
          transform: `translate(${visualPos.x}px, ${visualPos.y}px)`,
        }}
      >
        {/* Thumb grip texture */}
        <div className="absolute inset-2 rounded-full border border-black/10 opacity-50" />
      </div>
      
      {label && <div className="absolute -bottom-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</div>}
    </div>
  );
};

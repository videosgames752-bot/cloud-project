import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Triangle, Circle, Square, X, Menu, Pause } from 'lucide-react';
import { ControlInput } from '../utils/webrtc';
import { Joystick } from './Joystick';

interface VirtualGamepadProps {
  onInput: (input: ControlInput) => void;
}

export const VirtualGamepad: React.FC<VirtualGamepadProps> = ({ onInput }) => {
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set());

  const handlePress = (btn: string) => {
    setActiveButtons(prev => new Set(prev).add(btn));
    onInput({ type: 'gamepad', inputType: 'button', code: btn, value: 1 });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleRelease = (btn: string) => {
    setActiveButtons(prev => {
      const next = new Set(prev);
      next.delete(btn);
      return next;
    });
    onInput({ type: 'gamepad', inputType: 'button', code: btn, value: 0 });
  };

  const bindTouch = (btn: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      handlePress(btn);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      handleRelease(btn);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.preventDefault();
      handleRelease(btn);
    }
  });

  const handleJoystick = (indexBase: number, x: number, y: number) => {
    // indexBase: 0 for Left Stick, 2 for Right Stick
    onInput({ type: 'gamepad', inputType: 'axis', index: indexBase, value: x });     // X axis
    onInput({ type: 'gamepad', inputType: 'axis', index: indexBase + 1, value: y }); // Y axis
  };

  // Styles
  const dpadBase = "absolute flex items-center justify-center rounded-lg transition-all duration-100 backdrop-blur-md border shadow-lg touch-none";
  const dpadInactive = "bg-white/10 border-white/10 text-white/70 hover:bg-white/20";
  const dpadActive = "bg-white/30 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-95";

  const actionBase = "absolute w-14 h-14 rounded-full transition-all duration-100 backdrop-blur-md border shadow-lg flex items-center justify-center touch-none";
  const getActionStyle = (btn: string) => clsx(
    actionBase,
    activeButtons.has(btn) 
      ? "bg-white/30 border-white/40 scale-95 shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
      : "bg-white/5 border-white/10 hover:bg-white/10"
  );

  const shoulderBase = "absolute top-0 h-12 rounded-b-xl border-b border-x border-white/10 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white/50 transition-all active:bg-white/20 active:text-white";

  return (
    <div className="absolute inset-0 z-50 pointer-events-none select-none overflow-hidden gamepad-touch-lock">
      
      {/* --- SHOULDER BUTTONS (L1/R1/L2/R2) --- */}
      <div className="absolute top-0 left-0 w-full h-20 pointer-events-auto flex justify-between px-4">
        <div className="flex gap-2">
          <button {...bindTouch('L2')} className={clsx(shoulderBase, "w-20 bg-white/5", activeButtons.has('L2') && "bg-sky-500/30 text-sky-200")}>L2</button>
          <button {...bindTouch('L1')} className={clsx(shoulderBase, "w-20 bg-white/5", activeButtons.has('L1') && "bg-sky-500/30 text-sky-200")}>L1</button>
        </div>
        <div className="flex gap-2">
          <button {...bindTouch('R1')} className={clsx(shoulderBase, "w-20 bg-white/5", activeButtons.has('R1') && "bg-sky-500/30 text-sky-200")}>R1</button>
          <button {...bindTouch('R2')} className={clsx(shoulderBase, "w-20 bg-white/5", activeButtons.has('R2') && "bg-sky-500/30 text-sky-200")}>R2</button>
        </div>
      </div>

      {/* --- LEFT SIDE: D-PAD & LEFT STICK --- */}
      <div className="absolute bottom-6 left-8 pointer-events-auto flex flex-col items-center gap-6">
         
         {/* D-PAD */}
         <div className="relative w-40 h-40">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 rounded-full border border-white/5" />
            
            <button className={clsx(dpadBase, "top-0 left-1/2 -translate-x-1/2 h-14 w-12 rounded-t-xl", activeButtons.has('UP') ? dpadActive : dpadInactive)} {...bindTouch('UP')}><ChevronUp /></button>
            <button className={clsx(dpadBase, "bottom-0 left-1/2 -translate-x-1/2 h-14 w-12 rounded-b-xl", activeButtons.has('DOWN') ? dpadActive : dpadInactive)} {...bindTouch('DOWN')}><ChevronDown /></button>
            <button className={clsx(dpadBase, "left-0 top-1/2 -translate-y-1/2 w-14 h-12 rounded-l-xl", activeButtons.has('LEFT') ? dpadActive : dpadInactive)} {...bindTouch('LEFT')}><ChevronLeft /></button>
            <button className={clsx(dpadBase, "right-0 top-1/2 -translate-y-1/2 w-14 h-12 rounded-r-xl", activeButtons.has('RIGHT') ? dpadActive : dpadInactive)} {...bindTouch('RIGHT')}><ChevronRight /></button>
         </div>

         {/* LEFT STICK */}
         <div className="ml-16">
            <Joystick onMove={(x, y) => handleJoystick(0, x, y)} label="LS" />
         </div>
      </div>

      {/* --- CENTER: MENU --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-12 pointer-events-auto">
        <button className={clsx("w-12 h-6 rounded-full border border-white/10 flex items-center justify-center", activeButtons.has('SHARE') ? "bg-white/20" : "bg-white/5")} {...bindTouch('SHARE')}>
          <div className="w-1 h-3 bg-white/30 rounded-sm mx-[2px]" />
          <div className="w-1 h-3 bg-white/30 rounded-sm mx-[2px]" />
        </button>
        
        {/* PS Button / Home */}
        <button className={clsx("w-10 h-10 -mt-4 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10", activeButtons.has('PS') ? "bg-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.5)]" : "bg-black/40")} {...bindTouch('PS')}>
          <div className="w-4 h-4 bg-white/80 rounded-full opacity-80" />
        </button>

        <button className={clsx("w-12 h-6 rounded-full border border-white/10 flex items-center justify-center", activeButtons.has('OPTIONS') ? "bg-white/20" : "bg-white/5")} {...bindTouch('OPTIONS')}>
          <Menu className="w-3 h-3 text-white/50" />
        </button>
      </div>

      {/* --- RIGHT SIDE: ACTIONS & RIGHT STICK --- */}
      <div className="absolute bottom-6 right-8 pointer-events-auto flex flex-col items-center gap-6">
          
          {/* ACTION BUTTONS */}
          <div className="relative w-40 h-40">
            <button className={clsx(getActionStyle('TRIANGLE'), "top-0 left-1/2 -translate-x-1/2")} {...bindTouch('TRIANGLE')}>
              <Triangle className={clsx("w-5 h-5 fill-current", activeButtons.has('TRIANGLE') ? "text-green-400" : "text-green-400/80")} />
            </button>
            <button className={clsx(getActionStyle('CROSS'), "bottom-0 left-1/2 -translate-x-1/2")} {...bindTouch('CROSS')}>
              <X className={clsx("w-6 h-6", activeButtons.has('CROSS') ? "text-blue-400" : "text-blue-400/80")} strokeWidth={3} />
            </button>
            <button className={clsx(getActionStyle('SQUARE'), "left-0 top-1/2 -translate-y-1/2")} {...bindTouch('SQUARE')}>
              <Square className={clsx("w-5 h-5 fill-current", activeButtons.has('SQUARE') ? "text-pink-400" : "text-pink-400/80")} />
            </button>
            <button className={clsx(getActionStyle('CIRCLE'), "right-0 top-1/2 -translate-y-1/2")} {...bindTouch('CIRCLE')}>
              <Circle className={clsx("w-5 h-5 fill-current", activeButtons.has('CIRCLE') ? "text-red-400" : "text-red-400/80")} />
            </button>
          </div>

          {/* RIGHT STICK */}
          <div className="mr-16">
            <Joystick onMove={(x, y) => handleJoystick(2, x, y)} label="RS" />
          </div>
      </div>

    </div>
  );
};

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant } from '../types';
import { playTick, playWinnerSound, playSpinStart, getMuted, setMuted } from '../utils/audio';
import { Volume2, VolumeX, Play, HelpCircle, Trophy, UserMinus, Sparkles } from 'lucide-react';
import FacebookIcon from './FacebookIcon';

interface SpinEngineProps {
  participants: Participant[];
  onWinnerDrawn: (participant: Participant) => void;
  removeWinnerFromRoster: (id: string) => void;
}

export default function SpinEngine({
  participants,
  onWinnerDrawn,
  removeWinnerFromRoster,
}: SpinEngineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(!getMuted());
  
  // Angle states
  const [currentAngle, setCurrentAngle] = useState(0);
  const [wigglePointer, setWigglePointer] = useState(false);
  
  // Winner overlay
  const [winner, setWinner] = useState<Participant | null>(null);
  
  // Audio synch refs
  const lastTickIndexRef = useRef<number>(-1);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Clean animation frame on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleToggleMute = () => {
    setSoundEnabled(!soundEnabled);
  };

  const startDraw = () => {
    if (participants.length < 2) return;
    if (isSpinning) return;

    setWinner(null);
    setIsSpinning(true);
    playSpinStart();

    const winnerIdx = Math.floor(Math.random() * participants.length);
    spinWheelToWinner(winnerIdx);
  };

  // WHEEL OF FORTUNE DRAW ENGINE (Dynamic Tick Sound-Sync)
  const spinWheelToWinner = (winnerIdx: number) => {
    const N = participants.length;
    const sliceWidth = 360 / N;
    
    // Original angle theta to align slice winnerIdx to top pointer (270 degrees)
    const targetTheta = (winnerIdx * sliceWidth) + (sliceWidth / 2);
    let targetR = 270 - targetTheta;
    
    // Normalize targetR to negative rotation, then add 6-8 full rotations
    if (targetR > 0) targetR -= 360;
    const baseSpins = 360 * (Math.floor(Math.random() * 3) + 6); // 6 to 8 full spins
    const finalRotation = targetR - baseSpins;
    
    const startAngle = currentAngle % 360;
    const distance = finalRotation - startAngle;
    const duration = 5000; // 5 seconds
    const startTime = performance.now();

    const animateWheel = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Quartic ease-out equation
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const angle = startAngle + distance * easeOut;
      setCurrentAngle(angle);

      // Sound feedback: track slice index currently under the 270° pointer
      const theta = (270 - angle) % 360;
      const normalizedTheta = theta < 0 ? theta + 360 : theta;
      const currentTickIndex = Math.floor(normalizedTheta / sliceWidth) % N;

      if (currentTickIndex !== lastTickIndexRef.current) {
        lastTickIndexRef.current = currentTickIndex;
        // Adjust tone based on progress
        const toneHz = 600 + (1 - progress) * 300;
        playTick(toneHz, 0.03);
        
        // Flex pointer needle
        setWigglePointer(true);
        setTimeout(() => setWigglePointer(false), 50);
      }

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animateWheel);
      } else {
        // Finished
        setIsSpinning(false);
        const winnerParticipant = participants[winnerIdx];
        setWinner(winnerParticipant);
        onWinnerDrawn(winnerParticipant);
        playWinnerSound();
      }
    };

    requestRef.current = requestAnimationFrame(animateWheel);
  };

  // Generate wheel sectors
  const N = participants.length;
  const r = 180; // wheel radius
  
  // Calculate dynamic dimensions to maximize avatar size based on player count
  let avatarRadius = 23;
  let avatarDist = r * 0.48;
  let labelDist = r * 0.82;
  let fontSize = 9.5;

  if (N <= 4) {
    avatarRadius = 34;
    avatarDist = r * 0.58;
    labelDist = r * 0.85;
    fontSize = 11;
  } else if (N <= 6) {
    avatarRadius = 30;
    avatarDist = r * 0.58;
    labelDist = r * 0.84;
    fontSize = 10;
  } else if (N <= 8) {
    avatarRadius = 26;
    avatarDist = r * 0.56;
    labelDist = r * 0.82;
    fontSize = 9.5;
  } else if (N <= 12) {
    avatarRadius = 22;
    avatarDist = r * 0.54;
    labelDist = r * 0.80;
    fontSize = 8.5;
  } else if (N <= 16) {
    avatarRadius = 18;
    avatarDist = r * 0.52;
    labelDist = r * 0.79;
    fontSize = 8;
  } else {
    avatarRadius = 14;
    avatarDist = r * 0.50;
    labelDist = r * 0.78;
    fontSize = 7.5;
  }

  const sectors = participants.map((person, index) => {
    const angle = 360 / N;
    const startAngle = index * angle;
    
    // SVG coordinates
    const radStart = ((startAngle - 90) * Math.PI) / 180;
    const radEnd = (((startAngle + angle) - 90) * Math.PI) / 180;
    
    const cx = 200;
    const cy = 200;
    
    const x1 = cx + r * Math.cos(radStart);
    const y1 = cy + r * Math.sin(radStart);
    const x2 = cx + r * Math.cos(radEnd);
    const y2 = cy + r * Math.sin(radEnd);
    
    const flag = angle <= 180 ? 0 : 1;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${flag} 1 ${x2} ${y2} Z`;
    
    // Angle center for label and avatar placement
    const textAngle = startAngle + angle / 2;
    const radMid = ((textAngle - 90) * Math.PI) / 180;
    
    const lx = cx + labelDist * Math.cos(radMid);
    const ly = cy + labelDist * Math.sin(radMid);

    const ax = cx + avatarDist * Math.cos(radMid);
    const ay = cy + avatarDist * Math.sin(radMid);

    // Alternating modern sporty themed styling (Brazil Gold vs Norway Crimson Red)
    const colorClass = index % 2 === 0 ? 'url(#bra-gradient)' : 'url(#nor-gradient)';
    const borderClass = index % 2 === 0 ? 'stroke-amber-500/35' : 'stroke-red-500/35';
    const avatarStroke = index % 2 === 0 ? 'stroke-amber-400' : 'stroke-red-400';
    const textColor = index % 2 === 0 ? 'fill-amber-100' : 'fill-red-100';
    const avatarStyle = index % 2 === 0 
      ? { filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.5))' } 
      : { filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.5))' };
    
    return {
      d,
      lx,
      ly,
      ax,
      ay,
      rotation: textAngle,
      person,
      index,
      color: colorClass,
      borderLine: borderClass,
      avatarStroke,
      textColor,
      avatarStyle
    };
  });

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl p-6 flex flex-col items-center justify-between h-full relative">
      
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-lime-400" />
          <span className="text-xs font-bold text-slate-350 uppercase tracking-wider font-display">Interactive Draw</span>
        </div>

        <button
          onClick={handleToggleMute}
          className="p-2.5 rounded-2xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-lime-400 hover:bg-lime-500/10 transition cursor-pointer"
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Main Draw stage */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[360px] pb-6 relative">
        {participants.length < 2 ? (
          <div className="text-center max-w-sm px-6 py-12 bg-slate-950/20 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center">
            <HelpCircle size={44} className="text-lime-500/40 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Add Participants</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              To activate the interactive drawing wheel, you need to register at least <strong className="text-lime-400">2 participants</strong> in the roster list!
            </p>
          </div>
        ) : (
          <div className="relative w-full max-w-[320px] sm:max-w-[440px] md:max-w-[480px] aspect-square flex items-center justify-center">
            
            {/* Outer Glowing Pulsating Ring backdrop */}
            <div className="absolute inset-0 rounded-full border border-lime-500/10 animate-pulse pointer-events-none scale-[1.04]" />
            <div className="absolute inset-0 rounded-full border border-dashed border-slate-800/40 animate-spin-slow pointer-events-none scale-[1.02]" />

            {/* Pointer Needle (High-tech illuminated laser pointer) */}
            <div
              className={`absolute -top-2 left-1/2 -translate-x-1/2 z-30 transition-transform duration-75 origin-top ${
                wigglePointer ? 'rotate-12 scale-110' : 'rotate-0'
              }`}
            >
              <svg width="36" height="42" viewBox="0 0 36 42" fill="none" className="filter drop-shadow-[0_0_8px_rgba(132,204,22,0.6)]">
                <defs>
                  <linearGradient id="needle-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a3e635" />
                    <stop offset="100%" stopColor="#84cc16" />
                  </linearGradient>
                </defs>
                {/* Pointer glow shadow */}
                <path
                  d="M18 40 L6 12 H30 Z"
                  fill="url(#needle-grad)"
                />
                {/* Needle core details */}
                <path
                  d="M18 35 L10.5 14 H25.5 Z"
                  fill="#040d1a"
                />
                <path
                  d="M18 33 L13 15 H23 Z"
                  fill="url(#needle-grad)"
                  className="opacity-80"
                />
                {/* Top pivot circle */}
                <circle cx="18" cy="10" r="6" fill="#84cc16" />
                <circle cx="18" cy="10" r="3" fill="#040d1a" />
              </svg>
            </div>

            {/* Inner Glowing Center Ring / Stadium Center Circle (Interactive SPIN button) */}
            <button
              onClick={startDraw}
              disabled={isSpinning}
              className="absolute top-[calc(50%-36px)] left-[calc(50%-36px)] w-18 h-18 bg-slate-950 hover:bg-slate-900 border-4 border-lime-400 rounded-full shadow-[0_0_25px_rgba(163,230,53,0.5)] z-20 flex flex-col items-center justify-center cursor-pointer transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed select-none"
            >
              <div className="flex flex-col items-center justify-center relative">
                {!isSpinning && <div className="w-8 h-8 bg-lime-500/10 rounded-full flex items-center justify-center animate-ping absolute" />}
                <span className="text-[9px] font-black text-lime-400 font-display tracking-widest leading-none">SPIN</span>
                <Trophy size={11} className="text-lime-400 mt-1 animate-pulse" />
              </div>
            </button>

            {/* Rotating center ring track */}
            <div className="absolute top-[calc(50%-40px)] left-[calc(50%-40px)] w-20 h-20 rounded-full border border-dashed border-lime-500/20 animate-spin-slow pointer-events-none z-10" />

            {/* SVG Radial Wheel */}
            <div
              className="w-full h-full rounded-full shadow-[0_0_40px_rgba(0,0,0,0.6)] border-4 border-slate-800/90 overflow-hidden bg-slate-950 flex items-center justify-center relative select-none"
              style={{
                transform: `rotate(${currentAngle}deg)`,
                transition: isSpinning ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {/* Neon Glow Filter */}
                  <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  
                  {/* Brazil Gradient (Dark Gold/Amber theme) */}
                  <linearGradient id="bra-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1c1800" />
                    <stop offset="70%" stopColor="#3d3403" />
                    <stop offset="100%" stopColor="#705f03" />
                  </linearGradient>
                  
                  {/* Norway Gradient (Dark Red/Crimson theme) */}
                  <linearGradient id="nor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1f0206" />
                    <stop offset="70%" stopColor="#47060f" />
                    <stop offset="100%" stopColor="#7a0b1b" />
                  </linearGradient>
                </defs>

                {/* Outer decorative dial / stopwatch ticks */}
                <circle
                  cx="200"
                  cy="200"
                  r="194"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  className="opacity-40"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="188"
                  fill="none"
                  stroke="#a3e635"
                  strokeWidth="3"
                  strokeDasharray="2 8"
                  className="opacity-45"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="190"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="6 24"
                  className="opacity-30 animate-[spin_60s_linear_infinite]"
                  style={{ transformOrigin: 'center' }}
                />

                {/* Background sectors */}
                {sectors.map((sec) => (
                  <path
                    key={sec.index}
                    d={sec.d}
                    className={`${sec.color} ${sec.borderLine} stroke-[1.5] transition-colors duration-300`}
                  />
                ))}

                {/* Participant Labels & Circles */}
                {sectors.map((sec) => (
                  <g key={`labels-${sec.index}`} className="pointer-events-none">
                    {/* Avatar Image ClipPath */}
                    <defs>
                      <clipPath id={`clip-avatar-${sec.index}`}>
                        <circle cx={sec.ax} cy={sec.ay} r={avatarRadius} />
                      </clipPath>
                    </defs>

                    {/* Text */}
                    <text
                      x={sec.lx}
                      y={sec.ly}
                      transform={`rotate(${sec.rotation + 90}, ${sec.lx}, ${sec.ly})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: `${fontSize}px` }}
                      className={`font-black ${sec.textColor} tracking-wider font-display uppercase drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]`}
                    >
                      {sec.person.name.split(' ')[0]}
                    </text>

                    {/* Avatar Border & Backdrop */}
                    <circle
                      cx={sec.ax}
                      cy={sec.ay}
                      r={avatarRadius + 2}
                      className={`fill-slate-950 ${sec.avatarStroke} stroke-2`}
                      style={sec.avatarStyle}
                    />
                    {/* Avatar Image */}
                    <image
                      x={sec.ax - avatarRadius}
                      y={sec.ay - avatarRadius}
                      width={avatarRadius * 2}
                      height={avatarRadius * 2}
                      href={sec.person.avatar}
                      clipPath={`url(#clip-avatar-${sec.index})`}
                    />
                  </g>
                ))}
              </svg>
            </div>

          </div>
        )}
      </div>

      {/* Primary Spin CTA Button */}
      {participants.length >= 2 && (
        <div id="trigger-control-wrapper" className="w-full max-w-sm flex justify-center z-10 mt-2">
          <button
            onClick={startDraw}
            disabled={isSpinning}
            className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition duration-300 flex items-center justify-center gap-3 cursor-pointer shadow-md ${
              isSpinning
                ? 'bg-slate-950 border border-slate-850 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-400 hover:to-lime-500 text-slate-950 hover:shadow-lg hover:shadow-lime-500/10 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            <Play size={18} fill="currentColor" className={isSpinning ? 'animate-ping' : ''} />
            {isSpinning ? 'STIRRING LUCK...' : 'SPIN WHEEL'}
          </button>
        </div>
      )}

      {/* HIGH-IMPACT WINNER ANNOUNCEMENT MODAL */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#040d1a]/98 backdrop-blur-md rounded-3xl z-40 p-4 flex flex-col items-center justify-center text-center border border-slate-850"
          >
            {/* FUT-style Championship Card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.1, stiffness: 150, damping: 15 }}
              className="relative w-64 h-90 mb-5 group cursor-default"
            >
              {/* Outer Pulsing Glow */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-sky-500 via-lime-400 to-emerald-500 rounded-3xl animate-pulse blur-xl opacity-80" />
              
              {/* The Card Body */}
              <div className="relative w-full h-full bg-slate-950/95 backdrop-blur-md rounded-3xl border-2 border-lime-400 p-4 flex flex-col justify-between overflow-hidden shadow-2xl">
                {/* Diagonal Sporty Cyber Stripes background */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(132,204,22,0.04)_25%,transparent_25%,transparent_50%,rgba(132,204,22,0.04)_50%,rgba(132,204,22,0.04)_75%,transparent_75%,transparent)] bg-[size:20px_20px] pointer-events-none opacity-40" />

                {/* Card Top: Logo & Champion title */}
                <div className="flex justify-between items-center z-10 border-b border-slate-850 pb-2 flex-shrink-0">
                  <span className="text-[10px] font-black tracking-widest text-lime-400 uppercase font-display flex items-center gap-1">
                    <Trophy size={11} className="text-lime-400" />
                    TURFX WINNER
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🇦🇷</span>
                    <span className="text-[9px] text-slate-600 font-bold">VS</span>
                    <span className="text-xs">🇩🇿</span>
                  </div>
                </div>

                {/* Card Main Picture Frame */}
                <div className="flex-1 flex items-center justify-center my-3.5 relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                  <img
                    src={winner.avatar}
                    alt={winner.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Glowing Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-85" />
                  
                  {/* Glowing badge */}
                  <div className="absolute bottom-2 right-2 bg-lime-500 text-slate-950 rounded-full p-2 border border-slate-950 shadow-md">
                    <Sparkles size={14} className="animate-pulse" />
                  </div>
                </div>

                {/* Card Bottom: Winner Details */}
                <div className="text-center z-10 flex flex-col gap-1 border-t border-slate-900 pt-2 flex-shrink-0">
                  <h3 className="text-xl font-black text-white tracking-wide uppercase font-display truncate">
                    {winner.name}
                  </h3>
                  <div className="inline-flex items-center justify-center gap-1 text-[9px] text-lime-400 font-bold uppercase tracking-wider">
                    <span>LUCKY ENTRANT DRAWN</span>
                  </div>
                </div>
              </div>
            </motion.div>
 
            {/* Winner operations */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col gap-2 w-full max-w-[260px]"
            >
              {winner.fbLink && (
                <a
                  href={winner.fbLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-black rounded-2xl text-xs tracking-wider transition shadow-lg hover:shadow-sky-500/20 cursor-pointer flex items-center justify-center gap-2 font-display uppercase border border-sky-400/30"
                >
                  <FacebookIcon size={14} className="fill-white/10" />
                  Visit Facebook Profile
                </a>
              )}
              <button
                onClick={() => setWinner(null)}
                className="w-full py-3 px-4 bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-slate-950 font-black rounded-2xl text-xs tracking-wider transition shadow-lg hover:shadow-lime-500/10 cursor-pointer flex items-center justify-center gap-1.5 font-display"
              >
                Close Ceremony
              </button>
              
              <button
                onClick={() => {
                  const idToRemove = winner.id;
                  setWinner(null);
                  setTimeout(() => {
                    removeWinnerFromRoster(idToRemove);
                  }, 150);
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-rose-400 rounded-2xl text-xs font-semibold transition border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                title="Remove this participant so they are not drawn twice"
              >
                <UserMinus size={13} />
                Remove & Spin Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

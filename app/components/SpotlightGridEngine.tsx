"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant } from '../types';
import { playWinnerSound, getMuted, setMuted, playTick } from '../utils/audio';
import { Play, HelpCircle, UserMinus, Sparkles } from 'lucide-react';
import FacebookIcon from './FacebookIcon';

interface SpotlightGridEngineProps {
  participants: Participant[];
  onWinnerDrawn: (participant: Participant) => void;
  removeWinnerFromRoster: (id: string) => void;
}

export default function SpotlightGridEngine({
  participants,
  onWinnerDrawn,
  removeWinnerFromRoster,
}: SpotlightGridEngineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);

  // Refs for direct DOM manipulation (flawless 60 FPS performance)
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastIntegerRef = useRef<number>(-1);

  // Keep track of animation coordinates/time in a ref to avoid React state re-render lags
  const animStateRef = useRef({
    t: 0,
    isSpinning: false,
    tStart: 0,
    tFinal: 0,
    duration: 9000, // 9 seconds spin (increased for suspense)
    startTime: 0,
  });

  // Ensure sound is active on mount
  useEffect(() => {
    setMuted(false);
  }, []);

  // Generate items array with repeated participants to ensure the ring is full (at least 12 items)
  const items = useMemo(() => {
    const N = participants.length;
    if (N === 0) return [];
    const repeatCount = Math.ceil(12 / N);
    const result: Participant[] = [];
    for (let r = 0; r < repeatCount; r++) {
      result.push(...participants);
    }
    return result;
  }, [participants]);

  const M = items.length;

  // Window width tracking for responsive scales
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardScale = useMemo(() => {
    let baseScale = M > 24 ? 0.55 : M > 16 ? 0.70 : 0.85;
    if (windowWidth < 640) {
      baseScale = M > 24 ? 0.40 : M > 16 ? 0.50 : 0.60;
    } else if (windowWidth < 1024) {
      baseScale = M > 24 ? 0.48 : M > 16 ? 0.58 : 0.68;
    }
    return baseScale;
  }, [M, windowWidth]);

  // Main 3D frame animation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const DURATION_IDLE = 42000; // Slow rotation in idle state

    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      const state = animStateRef.current;
      const el = containerRef.current;
      const ring = ringRef.current;

      if (state.isSpinning) {
        if (state.startTime === 0) {
          state.startTime = now;
        }
        const elapsed = now - state.startTime;
        const progress = Math.min(elapsed / state.duration, 1);
        
        // Quintic ease out for a silky smooth deceleration
        const p_ease = 1 - Math.pow(1 - progress, 5);
        state.t = state.tStart + (state.tFinal - state.tStart) * p_ease;

        // Play tick sound when a card crosses the front line
        const currentInteger = Math.floor(state.t * M);
        if (currentInteger !== lastIntegerRef.current) {
          playTick(500 + progress * 200, 0.05);
          lastIntegerRef.current = currentInteger;
        }

        if (progress >= 1) {
          // Spin completed!
          state.isSpinning = false;
          setIsSpinning(false);

          // Find the winning card index that stopped at the front
          const targetIdx = Math.round(M - (state.tFinal % 1) * M) % M;
          const winnerPlayer = items[targetIdx];
          
          setTimeout(() => {
            setWinner(winnerPlayer);
            onWinnerDrawn(winnerPlayer);
            playWinnerSound();
          }, 300);
        }
      } else {
        // Slow idle rotation
        state.t = (state.t - dt / DURATION_IDLE + 1) % 1;
        state.startTime = 0;
      }

      if (el && ring) {
        const W = el.clientWidth;
        
        // Scalable 3D radius based on width
        let R = Math.min(W * 0.35, 880);
        if (W < 640) {
          R = Math.min(W * 0.38, 230); 
        } else if (W < 1024) {
          R = Math.min(W * 0.36, 420);
        }

        // Rotate the ring in 3D
        ring.style.transform = `translate(-50%, -50%) rotateX(8deg) rotateY(${state.t * 360}deg)`;

        for (let i = 0; i < M; i++) {
          const node = itemRefs.current[i];
          if (!node) continue;

          const angle = (i / M) * Math.PI * 2;
          const world = angle + state.t * Math.PI * 2;
          const front = Math.cos(world);
          const opacity = 0.18 + ((front + 1) / 2) * 0.82;

          node.style.transform = `translate(-50%, -50%) rotateY(${(angle * 180) / Math.PI}deg) translateZ(${R}px)`;
          node.style.opacity = String(opacity);
          node.style.zIndex = String(Math.round((front + 1) * 100));

          // Highlight the card directly facing the viewer
          const isFront = front > 0.97;
          const cardOuter = node.querySelector(`#entrant-card-${i}`) as HTMLDivElement;
          const avatarFrame = cardOuter?.querySelector('.relative') as HTMLDivElement;
          const playerNameText = cardOuter?.querySelector('h4') as HTMLHeadingElement;
          
          if (cardOuter) {
            // Snappy organic spring ease transition
            cardOuter.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.15s, filter 0.15s, background-image 0.15s';
            if (isFront) {
              if (state.isSpinning) {
                cardOuter.style.borderColor = '#bef264'; // Lime 300
                cardOuter.style.transform = 'scale(1.35)'; // Card gets bigger during spin!
                cardOuter.style.filter = 'drop-shadow(0 0 25px rgba(163,230,53,0.65))';
                cardOuter.style.background = 'linear-gradient(135deg, #163f22 0%, #020612 100%)';
                if (playerNameText) playerNameText.style.color = '#bef264';
                if (avatarFrame) avatarFrame.style.borderColor = '#bef264';
              } else {
                cardOuter.style.borderColor = '#84cc16'; // Lime 500
                cardOuter.style.transform = 'scale(1.18)'; // Focus scale
                cardOuter.style.filter = 'drop-shadow(0 0 15px rgba(132,204,22,0.45))';
                cardOuter.style.background = 'linear-gradient(135deg, #0d2a17 0%, #020612 100%)';
                if (playerNameText) playerNameText.style.color = '#a3e635'; // Lime 400
                if (avatarFrame) avatarFrame.style.borderColor = '#84cc16';
              }
            } else {
              cardOuter.style.borderColor = '#112217'; // Dark green border
              cardOuter.style.transform = 'scale(1)';
              cardOuter.style.filter = 'none';
              cardOuter.style.background = 'linear-gradient(135deg, #06150e 0%, #020612 100%)';
              if (playerNameText) playerNameText.style.color = '#94a3b8';
              if (avatarFrame) avatarFrame.style.borderColor = '#112217';
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items, M]);

  const startDraw = () => {
    if (participants.length < 2) return;
    if (isSpinning) return;

    setWinner(null);
    setIsSpinning(true);

    const winnerIdx = Math.floor(Math.random() * participants.length);
    const winningPlayer = participants[winnerIdx];

    // Find the target index in the repeated items array
    const targetIdxInItems = items.findIndex(item => item.id === winningPlayer.id);

    const spins = 7; // 7 full spins (increased to match longer duration)
    const state = animStateRef.current;
    
    state.tStart = state.t;
    // Calculate the target rotation angle to place the winner exactly in front
    const tTarget = (M - targetIdxInItems) / M;
    state.tFinal = Math.ceil(state.t) + spins + tTarget;
    state.startTime = 0; 
    state.isSpinning = true;
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full relative overflow-hidden select-none">
      
      {/* Stadium corner lighting beams */}
      <div className="absolute top-0 left-0 w-64 h-screen bg-gradient-to-br from-lime-400/10 to-transparent blur-3xl opacity-40 -rotate-12 transform origin-top-left pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-64 h-screen bg-gradient-to-bl from-emerald-400/10 to-transparent blur-3xl opacity-40 rotate-12 transform origin-top-right pointer-events-none z-0" />


      {/* Main Draw stage */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 overflow-hidden">
        {participants.length < 2 ? (
          <div className="text-center max-w-sm px-6 py-12 bg-slate-950/60 rounded-3xl border border-emerald-500/15 flex flex-col items-center justify-center backdrop-blur-md">
            <HelpCircle size={44} className="text-emerald-500/40 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Add Participants</h3>
            <p className="text-xs text-slate-450 mt-2 leading-relaxed">
              To activate the 3D Ring carousel, you need to register at least <strong className="text-amber-400">2 participants</strong> in the roster list!
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* 3D Ring Container */}
            <div
              ref={containerRef}
              className="relative w-full h-[360px] sm:h-[400px] md:h-[480px] flex items-center justify-center overflow-visible pointer-events-auto"
              style={{
                perspective: "2000px",
                perspectiveOrigin: "50% 50%", 
              }}
            >
              <div
                ref={ringRef}
                className="absolute w-0 h-0"
                style={{ transformStyle: "preserve-3d" }}
              >
                {items.map((person, i) => {
                  return (
                    <div
                      key={`${person.id}-${i}`}
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      className="absolute left-0 top-0 will-change-transform"
                      style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                    >
                      <div 
                        style={{ transform: `scale(${cardScale})`, transformOrigin: "center" }}
                        className="transition-all duration-305"
                      >
                        {/* Simple, clean profile card layout */}
                        <div
                          id={`entrant-card-${i}`}
                          className="w-[155px] h-[220px] rounded-[24px] border select-none relative p-4 flex flex-col items-center justify-center text-center transition-all duration-305 animate-fade-in"
                          style={{
                            background: 'linear-gradient(135deg, #06150e 0%, #020612 100%)',
                            borderColor: '#112217',
                          }}
                        >
                          {/* Large circular avatar */}
                          <div className="relative w-20 h-20 mb-4 flex-shrink-0 rounded-full overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex items-center justify-center">
                            <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                          </div>

                          {/* Player name */}
                          <div className="w-full text-center mt-2">
                            <h4 className="text-sm font-bold tracking-wide truncate text-slate-350">
                              {person.name}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Draw Kickoff Button */}
      {participants.length >= 2 && (
        <div className="w-full flex justify-center z-10 mt-5 flex-shrink-0">
          <button
            onClick={startDraw}
            disabled={isSpinning}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md ${
              isSpinning
                ? 'bg-slate-900 border border-lime-500/10 text-slate-500 cursor-not-allowed shadow-none scale-95'
                : 'bg-gradient-to-r from-lime-400 via-lime-500 to-emerald-500 text-slate-950 hover:from-lime-300 hover:to-emerald-400 hover:shadow-lime-500/20 active:scale-95'
            }`}
          >
            <span className={`text-base ${isSpinning ? 'animate-spin' : 'animate-bounce'}`}>⚽</span>
            <span>{isSpinning ? 'spinning...' : 'spin'}</span>
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
            className="absolute inset-0 bg-[#020a06]/98 backdrop-blur-md rounded-3xl z-40 p-4 flex flex-col items-center justify-center text-center border border-lime-500/15"
          >
            {/* Clean Winner Profile Card (Enlarged) */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.1, stiffness: 150, damping: 15 }}
              className="relative w-[400px] h-[450px] mb-6 group cursor-default rounded-[32px] border border-lime-500/30 p-6 shadow-[0_0_50px_rgba(132,204,22,0.25)] flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0b2414 0%, #020612 100%)'
              }}
            >
              {/* Large circular avatar */}
              <div className="relative w-36 h-36 mb-5 flex-shrink-0 rounded-full overflow-hidden border-2 border-lime-400/60 bg-slate-950 shadow-lg">
                <img
                  src={winner.avatar}
                  alt={winner.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Winner Details */}
              <div className="text-center w-full mt-2 flex flex-col items-center">
                <span className="text-[11px] font-bold text-lime-400 uppercase tracking-widest block mb-1">
                  Winner Drawn! 🎉
                </span>
                <h3 className="text-3xl font-black text-white tracking-wide uppercase truncate max-w-[340px] mx-auto mb-1">
                  {winner.name}
                </h3>
                
                {winner.fbLink && (
                  <a
                    href={winner.fbLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 px-6 py-3 bg-slate-950 hover:bg-slate-900 border border-lime-500/25 text-lime-300 hover:text-lime-200 font-bold rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md shadow-lime-500/5"
                  >
                    <FacebookIcon size={14} className="fill-lime-400/10 text-lime-400" />
                    <span className="truncate max-w-[200px]">
                      {winner.fbLink.replace('https://www.facebook.com/', '').replace('https://facebook.com/', '') || 'Facebook Profile'}
                    </span>
                  </a>
                )}
              </div>
            </motion.div>

            {/* Winner operations */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col gap-2 w-full max-w-[320px]"
            >
              <button
                onClick={() => setWinner(null)}
                className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black rounded-2xl text-xs tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-1.5 font-display"
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
                className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-rose-400 rounded-2xl text-xs font-semibold transition border border-emerald-500/10 hover:border-emerald-500/25 cursor-pointer flex items-center justify-center gap-1.5"
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

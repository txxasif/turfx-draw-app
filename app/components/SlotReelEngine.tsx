"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import { Participant } from '../types';
import { playTick, playWinnerSound, playSpinStart, getMuted, setMuted } from '../utils/audio';
import { Volume2, VolumeX, Play, HelpCircle, Trophy, UserMinus, Sparkles } from 'lucide-react';
import FacebookIcon from './FacebookIcon';

interface SlotReelEngineProps {
  participants: Participant[];
  onWinnerDrawn: (participant: Participant) => void;
  removeWinnerFromRoster: (id: string) => void;
}

export default function SlotReelEngine({
  participants,
  onWinnerDrawn,
  removeWinnerFromRoster,
}: SlotReelEngineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(!getMuted());
  const [winner, setWinner] = useState<Participant | null>(null);
  
  const [deck, setDeck] = useState<Participant[]>([]);
  const controls = useAnimationControls();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTickIndexRef = useRef<number>(-1);
  const audioContextReadyRef = useRef(false);

  const cardWidth = 140; // width of card
  const cardGap = 16; // gap between cards
  const pitch = cardWidth + cardGap; // 156px total spacing

  useEffect(() => {
    setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Build a randomized long deck of cards for representation
  const generateDeck = (winnerIdx: number) => {
    const N = participants.length;
    if (N < 2) return [];

    const tempDeck: Participant[] = [];
    const minCards = 65; // Track has to be long enough to slide
    
    // Fill deck with shuffled participants
    for (let i = 0; i < minCards; i++) {
      if (i === 55) {
        // Place the pre-selected winner at index 55
        tempDeck.push(participants[winnerIdx]);
      } else {
        const randIdx = Math.floor(Math.random() * N);
        tempDeck.push(participants[randIdx]);
      }
    }
    return tempDeck;
  };

  const handleToggleMute = () => {
    setSoundEnabled(!soundEnabled);
  };

  const startDraw = async () => {
    if (participants.length < 2) return;
    if (isSpinning) return;

    setWinner(null);
    setIsSpinning(true);
    playSpinStart();

    const winnerIdx = Math.floor(Math.random() * participants.length);
    const newDeck = generateDeck(winnerIdx);
    setDeck(newDeck);
    
    // Allow React state to update deck cards
    setTimeout(() => {
      triggerReelAnimation(55, newDeck[55]);
    }, 50);
  };

  const triggerReelAnimation = async (winnerDeckIndex: number, winningPlayer: Participant) => {
    if (!containerRef.current) return;
    const viewportWidth = containerRef.current.offsetWidth;
    const centerOffset = viewportWidth / 2;
    
    // The starting x offset (align card 2 to the center initially)
    const startX = centerOffset - (2 * pitch + cardWidth / 2);
    
    // The target x offset (align winner card to the center)
    const targetX = centerOffset - (winnerDeckIndex * pitch + cardWidth / 2);
    
    // Reset position instantly
    controls.set({ x: startX });
    lastTickIndexRef.current = -1;

    // Trigger sliding animation
    await controls.start({
      x: targetX,
      transition: {
        duration: 5.5,
        ease: [0.08, 0.82, 0.16, 1.0], // Custom slow-decelerating ease curve
      }
    });

    // Finished
    setIsSpinning(false);
    setWinner(winningPlayer);
    onWinnerDrawn(winningPlayer);
    playWinnerSound();
  };

  // Sound ticking hook triggered on motion container updates
  const handleUpdate = (latest: any) => {
    if (!containerRef.current || deck.length === 0) return;
    const viewportWidth = containerRef.current.offsetWidth;
    const centerOffset = viewportWidth / 2;
    
    // Calculate which card is currently passing the center target line
    const xVal = typeof latest.x === 'number' ? latest.x : parseFloat(latest.x || '0');
    const currentTickIndex = Math.round((centerOffset - xVal - cardWidth / 2) / pitch);

    if (currentTickIndex >= 0 && currentTickIndex < deck.length && currentTickIndex !== lastTickIndexRef.current) {
      lastTickIndexRef.current = currentTickIndex;
      // Adjust click tone pitch slightly based on sliding velocity / deceleration
      const progress = Math.max(0, Math.min(1, currentTickIndex / 55));
      const toneHz = 500 + (1 - progress) * 250;
      playTick(toneHz, 0.035);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl p-6 flex flex-col items-center justify-between h-full relative overflow-hidden">
      
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-lime-400" />
          <span className="text-xs font-bold text-slate-350 uppercase tracking-wider font-display">Card Slot Reel</span>
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
              To activate the card slot reel, you need to register at least <strong className="text-lime-400">2 participants</strong> in the roster list!
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center relative">
            
            {/* Target Crosshair Pointer (Neon lime arrows pointing to center card) */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-lime-400/30 z-20 pointer-events-none" />
            
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none filter drop-shadow-[0_0_8px_rgba(132,204,22,0.8)]">
              <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                <path d="M12 18L2 2H22L12 18Z" fill="#84cc16" />
              </svg>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none filter drop-shadow-[0_0_8px_rgba(132,204,22,0.8)]">
              <svg width="24" height="18" viewBox="0 0 24 18" fill="none" className="rotate-185">
                <path d="M12 18L2 2H22L12 18Z" fill="#84cc16" />
              </svg>
            </div>

            {/* Glowing slot frame */}
            <div className="absolute inset-x-0 h-64 bg-slate-950/30 border border-slate-850/80 rounded-2xl pointer-events-none scale-[1.01]" />

            {/* Viewport Masked Container */}
            <div 
              ref={containerRef}
              className="w-full h-60 overflow-hidden relative flex items-center select-none bg-slate-950/40 border border-slate-900 rounded-xl"
            >
              {/* Conveyor track */}
              <motion.div
                animate={controls}
                onUpdate={handleUpdate}
                className="flex items-center gap-4 px-4 whitespace-nowrap"
                style={{ x: 0 }}
              >
                {deck.length === 0 ? (
                  // Initial display placeholder deck
                  <div className="flex gap-4">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const person = participants[idx % participants.length];
                      const borderCol = idx % 2 === 0 ? 'border-sky-500/20' : 'border-emerald-500/20';
                      return (
                        <div
                          key={`init-${idx}`}
                          className={`w-[140px] h-[190px] bg-slate-900/60 border ${borderCol} rounded-2xl p-2.5 flex flex-col justify-between items-center opacity-40`}
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-800 bg-slate-950 flex-shrink-0">
                            <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 font-display truncate w-full text-center">
                            {person.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Active drawing deck
                  deck.map((person, idx) => {
                    const borderCol = idx % 2 === 0 
                      ? 'border-sky-500/30 bg-sky-950/10' 
                      : 'border-emerald-500/30 bg-emerald-950/10';
                    const glowCol = idx % 2 === 0 ? 'shadow-sky-500/5' : 'shadow-emerald-500/5';
                    
                    return (
                      <div
                        key={`deck-${idx}-${person.id}`}
                        style={{ width: `${cardWidth}px`, height: '190px' }}
                        className={`bg-slate-900/80 border ${borderCol} rounded-2xl p-2.5 flex flex-col justify-between items-center flex-shrink-0 shadow-lg ${glowCol}`}
                      >
                        {/* Team flags emblem */}
                        <div className="w-full flex justify-between items-center text-[8px] text-slate-500 font-bold border-b border-slate-800 pb-1.5 uppercase font-display">
                          <span>{person.fbLink ? <FacebookIcon size={10} className="text-sky-400 fill-sky-400/15 inline" /> : 'TURFX'}</span>
                          <span>{idx % 2 === 0 ? '🇦🇷' : '🇩🇿'}</span>
                        </div>

                        {/* Player photo */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 my-2">
                          <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                        </div>

                        {/* Player name */}
                        <span className="text-xs font-black text-slate-200 font-display truncate w-full text-center uppercase">
                          {person.name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })
                )}
              </motion.div>
            </div>
            
          </div>
        )}
      </div>

      {/* Primary Draw Button */}
      {participants.length >= 2 && (
        <div className="w-full max-w-sm flex justify-center z-10 mt-2">
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
            {isSpinning ? 'SLIDING REELS...' : 'DRAW WINNER'}
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
                <div className="flex justify-between items-center z-10 border-b border-slate-855 pb-2 flex-shrink-0">
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

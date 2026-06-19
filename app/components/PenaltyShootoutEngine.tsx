"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant } from '../types';
import { playWinnerSound, getMuted, setMuted, playKickSound, playGoalCheer, playTick } from '../utils/audio';
import { Volume2, VolumeX, Play, HelpCircle, Trophy, UserMinus, Sparkles } from 'lucide-react';
import FacebookIcon from './FacebookIcon';

interface PenaltyShootoutEngineProps {
  participants: Participant[];
  onWinnerDrawn: (participant: Participant) => void;
  removeWinnerFromRoster: (id: string) => void;
}

interface Finalist {
  person: Participant;
  xOffset: number; // visual placement X coordinate in the net
  state: 'active' | 'saved' | 'scored';
}

export default function PenaltyShootoutEngine({
  participants,
  onWinnerDrawn,
  removeWinnerFromRoster,
}: PenaltyShootoutEngineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(!getMuted());
  const [winner, setWinner] = useState<Participant | null>(null);

  // Shootout States
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [goalieX, setGoalieX] = useState(0);
  const [ballState, setBallState] = useState({ x: 0, y: 110, scale: 1, opacity: 1 });
  const [netShake, setNetShake] = useState(false);
  const [shootoutStatus, setShootoutStatus] = useState<string>('Select draw to kick off!');

  useEffect(() => {
    setMuted(!soundEnabled);
  }, [soundEnabled]);

  const handleToggleMute = () => {
    setSoundEnabled(!soundEnabled);
  };

  const startDraw = () => {
    if (participants.length < 2) return;
    if (isSpinning) return;

    setWinner(null);
    setIsSpinning(true);
    setNetShake(false);
    setGoalieX(0);
    setBallState({ x: 0, y: 110, scale: 1, opacity: 1 });

    const N = participants.length;
    const winnerIdx = Math.floor(Math.random() * N);
    const winningPlayer = participants[winnerIdx];

    // Select finalists: Winner + up to 3 other random participants
    const finalistsList: Finalist[] = [];
    const others = participants.filter((p, idx) => idx !== winnerIdx);
    
    // Shuffle others
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
    const selectedOthers = shuffledOthers.slice(0, 3);
    
    // Combine winner + others, shuffle position
    const pool = [winningPlayer, ...selectedOthers].sort(() => 0.5 - Math.random());
    
    // Spread them visually across the goal mouth (X coordinates: -100, -33, 33, 100)
    const spacing = pool.length === 2 ? [-60, 60] : pool.length === 3 ? [-80, 0, 80] : [-100, -33, 33, 100];
    
    pool.forEach((person, idx) => {
      finalistsList.push({
        person,
        xOffset: spacing[idx],
        state: 'active'
      });
    });

    setFinalists(finalistsList);
    setShootoutStatus('Roster selected. Line up for kickoff!');

    // Start shootout cycles
    setTimeout(() => {
      runShootoutRounds(finalistsList, winningPlayer);
    }, 1200);
  };

  const runShootoutRounds = (currentFinalists: Finalist[], winningPlayer: Participant) => {
    // We kick at non-winners one by one, then kick at the winner
    const nonWinners = currentFinalists.filter(f => f.person.id !== winningPlayer.id);
    const winnerFinalist = currentFinalists.find(f => f.person.id === winningPlayer.id)!;

    let roundIdx = 0;

    const executeRound = () => {
      if (roundIdx < nonWinners.length) {
        const target = nonWinners[roundIdx];
        setShootoutStatus(`Kicking penalty at ${target.person.name}...`);
        
        // Goalie anticipates and blocks
        setTimeout(() => {
          // Play kick thud sound
          playKickSound();
          
          // Ball travels to target
          setBallState({ x: target.xOffset, y: -45, scale: 0.5, opacity: 1 });
          
          // Goalie dives to save
          setGoalieX(target.xOffset);

          setTimeout(() => {
            // Play block sound (high tick)
            playTick(700, 0.08);
            
            // Mark target saved
            setFinalists(prev => prev.map(f => f.person.id === target.person.id ? { ...f, state: 'saved' } : f));
            setShootoutStatus(`SAVED! The goalkeeper blocks ${target.person.name.split(' ')[0]}!`);
            
            // Reset ball after short pause
            setTimeout(() => {
              setBallState({ x: 0, y: 110, scale: 1, opacity: 1 });
              setGoalieX(0);
              roundIdx++;
              setTimeout(executeRound, 1000);
            }, 800);
          }, 500);
        }, 500);

      } else {
        // FINAL SHOT: Kick at the winner
        setShootoutStatus(`Match point! Final penalty kick...`);
        
        setTimeout(() => {
          playKickSound();
          
          // Ball travels to goal
          setBallState({ x: winnerFinalist.xOffset, y: -55, scale: 0.45, opacity: 0.95 });
          
          // Goalie dives the wrong way!
          const wrongWayX = winnerFinalist.xOffset > 0 ? -60 : 60;
          setGoalieX(wrongWayX);

          setTimeout(() => {
            // Shake net
            setNetShake(true);
            
            // Play goalie cheer & stadium roar!
            playGoalCheer();
            
            // Mark scored
            setFinalists(prev => prev.map(f => f.person.id === winnerFinalist.person.id ? { ...f, state: 'scored' } : f));
            setShootoutStatus(`GOAL!!! ${winnerFinalist.person.name} scores the winner! 🏆`);
            
            // Trigger celebration modal
            setTimeout(() => {
              setIsSpinning(false);
              setWinner(winningPlayer);
              onWinnerDrawn(winningPlayer);
              playWinnerSound();
            }, 1800);
          }, 500);
        }, 800);
      }
    };

    executeRound();
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl p-6 flex flex-col items-center justify-between h-full relative overflow-hidden">
      
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-lime-400" />
          <span className="text-xs font-bold text-slate-350 uppercase tracking-wider font-display">Penalty Shootout</span>
        </div>

        <button
          onClick={handleToggleMute}
          className="p-2.5 rounded-2xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-lime-400 hover:bg-lime-500/10 transition cursor-pointer"
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Main Draw stage */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[360px] pb-6 relative select-none">
        {participants.length < 2 ? (
          <div className="text-center max-w-sm px-6 py-12 bg-slate-950/20 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center">
            <HelpCircle size={44} className="text-lime-500/40 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Add Participants</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              To activate the penalty shootout simulator, you need to register at least <strong className="text-lime-400">2 participants</strong> in the roster list!
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center relative h-full justify-between">
            
            {/* HUD Match Info Screen */}
            <div className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-3 py-1.5 text-center mb-4 text-[10px] text-lime-400 font-bold uppercase tracking-wider font-display">
              ⚽ {shootoutStatus}
            </div>

            {/* Soccer Pitch Goal Area */}
            <div className="w-full flex-1 bg-gradient-to-b from-emerald-950/40 to-slate-950/20 border border-slate-850 rounded-2xl relative overflow-hidden flex flex-col items-center p-4 min-h-[220px]">
              
              {/* Pitch Marking Lines */}
              <div className="absolute inset-x-0 bottom-0 h-10 border-t border-dashed border-white/10" />
              <div className="absolute left-1/2 bottom-0 w-20 h-10 border-x border-t border-white/10 -translate-x-1/2 rounded-t-full" />
              
              {/* Goalpost Frame */}
              <motion.div 
                animate={netShake ? { x: [-3, 3, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="w-[280px] h-32 border-x-4 border-t-4 border-slate-200/90 rounded-t relative overflow-hidden flex items-center justify-center"
              >
                {/* Soccer Net Mesh Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:8px_8px]" />

                {/* Finalist Jersey Cards standing in the Net */}
                {finalists.map((f, index) => {
                  const isSaved = f.state === 'saved';
                  const isScored = f.state === 'scored';
                  
                  return (
                    <motion.div
                      key={`finalist-${f.person.id}`}
                      style={{ x: f.xOffset, y: -10 }}
                      className={`absolute w-12 h-16 rounded-xl border flex flex-col items-center justify-between p-1 bg-slate-950/90 shadow transition-all duration-300 ${
                        isSaved 
                          ? 'border-slate-800 opacity-20 scale-90 line-through' 
                          : isScored 
                            ? 'border-lime-400 ring-2 ring-lime-400/30 scale-110 shadow-[0_0_12px_#84cc16]' 
                            : 'border-slate-700'
                      }`}
                    >
                      {f.person.fbLink && (
                        <div className="absolute top-0.5 right-0.5 bg-sky-950 rounded-full border border-sky-500/30 p-0.5 z-10">
                          <FacebookIcon size={6} className="text-sky-400 fill-sky-400/10" />
                        </div>
                      )}
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-800 bg-slate-900">
                        <img src={f.person.avatar} alt={f.person.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[7px] font-black text-slate-300 font-display truncate w-full text-center uppercase">
                        {f.person.name.split(' ')[0]}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Goalie Character */}
                <motion.div
                  animate={{ x: goalieX }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="absolute bottom-1 w-10 h-14 bg-gradient-to-b from-sky-400 to-sky-500 rounded-lg border-2 border-slate-950 flex flex-col items-center justify-center text-[8px] font-black text-slate-950 shadow-md z-10"
                >
                  <div className="w-6 h-5 bg-sky-200 border border-sky-600 rounded flex items-center justify-center font-display text-[7px] mb-1">
                    GK
                  </div>
                  <div className="text-[8px]">👐</div>
                </motion.div>

              </motion.div>

              {/* Penalty Spot */}
              <div className="absolute bottom-6 w-3 h-3 bg-white/30 rounded-full left-1/2 -translate-x-1/2" />

              {/* Soccer Ball */}
              <motion.div
                animate={ballState}
                transition={isSpinning ? { duration: 0.5, ease: 'easeOut' } : { type: 'spring', stiffness: 100 }}
                className="absolute left-[calc(50%-14px)] bottom-4 w-7 h-7 bg-white rounded-full border border-slate-900 flex items-center justify-center text-xs shadow-lg z-20"
              >
                ⚽
              </motion.div>

            </div>

          </div>
        )}
      </div>

      {/* Primary Kickoff Button */}
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
            {isSpinning ? 'SHOOTOUT RUNNING...' : 'KICK PENALTY'}
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

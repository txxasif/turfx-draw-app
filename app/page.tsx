"use client";

import { useState, useEffect } from 'react';
import { Participant } from './types';
import { INITIAL_PRESETS } from './utils/presets';
import SpotlightGridEngine from './components/SpotlightGridEngine';
import ConfettiEffect from './components/ConfettiEffect';
import { Shuffle } from 'lucide-react';

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeConfetti, setActiveConfetti] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load roster from localStorage safely on mount to prevent hydration mismatches
  useEffect(() => {
    try {
      const savedParticipants = localStorage.getItem('luckydraw_participants_v2');
      setParticipants(savedParticipants ? JSON.parse(savedParticipants) : INITIAL_PRESETS);
    } catch {
      setParticipants(INITIAL_PRESETS);
    }
    setIsLoaded(true);
  }, []);

  // Listen to cross-tab storage changes for real-time magic syncing!
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'luckydraw_participants_v2') {
        try {
          setParticipants(e.newValue ? JSON.parse(e.newValue) : []);
        } catch (err) {
          console.error('Storage sync failed:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto shutoff confetti after a brief duration to conserve CPU
  useEffect(() => {
    if (activeConfetti) {
      const timer = setTimeout(() => {
        setActiveConfetti(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeConfetti]);

  // Save setters
  const updateRoster = (newRoster: Participant[]) => {
    setParticipants(newRoster);
    try {
      localStorage.setItem('luckydraw_participants_v2', JSON.stringify(newRoster));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const handleWinnerDrawn = (victor: Participant) => {
    setActiveConfetti(true);
  };

  const handleRemoveWinnerFromRoster = (id: string) => {
    updateRoster(participants.filter((p) => p.id !== id));
  };

  if (!isLoaded) {
    return (
      <div className="h-screen bg-[#020d07] text-slate-200 flex flex-col antialiased items-center justify-center">
        {/* Sleek loading screen */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400 font-display">Initializing TURFX Draw...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen text-slate-200 flex flex-col antialiased relative overflow-hidden"
      style={{
        background: 'repeating-linear-gradient(90deg, #020b05, #020b05 120px, #031208 120px, #031208 240px)',
      }}
    >
      {/* Static center-stadium light glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[180px] pointer-events-none -z-10" />

      {/* Tactical Football Pitch markings overlay */}
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-[0.06]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Outer field lines */}
          <rect x="3%" y="3%" width="94%" height="94%" fill="none" stroke="#ffffff" strokeWidth="2" />
          
          {/* Halfway line */}
          <line x1="50%" y1="3%" x2="50%" y2="97%" stroke="#ffffff" strokeWidth="2" />
          
          {/* Center Circle & Spot */}
          <circle cx="50%" cy="50%" r="80" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx="50%" cy="50%" r="5" fill="#ffffff" />
          
          {/* Left Goal/Penalty Box */}
          <rect x="3%" y="25%" width="12%" height="50%" fill="none" stroke="#ffffff" strokeWidth="2" />
          <rect x="3%" y="37%" width="4%" height="26%" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx="12%" cy="50%" r="3" fill="#ffffff" />
          <path d="M 15%,42% A 80,80 0 0,1 15%,58%" fill="none" stroke="#ffffff" strokeWidth="2" />

          {/* Right Goal/Penalty Box */}
          <rect x="85%" y="25%" width="12%" height="50%" fill="none" stroke="#ffffff" strokeWidth="2" />
          <rect x="93%" y="37%" width="4%" height="26%" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx="88%" cy="50%" r="3" fill="#ffffff" />
          <path d="M 85%,42% A 80,80 0 0,0 85%,58%" fill="none" stroke="#ffffff" strokeWidth="2" />
        </svg>
      </div>

      {/* Confetti canvas overlay */}
      <ConfettiEffect active={activeConfetti} />

      {/* TURFX Header component */}
      <header className="sticky top-0 z-30 px-6 py-4 flex-shrink-0 w-full bg-transparent">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img src="/logo.png" alt="TURFX Logo" className="h-10 w-auto object-contain hover:scale-105 transition-all duration-300" />
            <div className="hidden sm:block border-l border-slate-800 h-8 mx-1" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black italic tracking-wider text-white flex items-center gap-1 font-display leading-none">
                TURF<span className="text-lime-400">X</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Facebook Giveaway Draw</p>
            </div>
          </div>

          {/* Center Match Placard Scoreboard */}
          <div className="hidden md:flex items-center gap-3.5 px-4 py-2 bg-slate-950/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl shadow-inner shadow-black/50">
            <div className="flex items-center gap-2 text-xs font-black tracking-wide text-slate-200 font-display">
              <span className="flex items-center gap-1 text-sky-400">🇦🇷 ARGENTINA</span>
              <span className="text-slate-600 px-1 font-sans font-normal">VS</span>
              <span className="flex items-center gap-1 text-emerald-400">ALGERIA 🇩🇿</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse shadow-[0_0_8px_#84cc16]" />
            <span className="text-[9px] font-black text-lime-400 tracking-widest uppercase font-display">LIVE DRAW</span>
          </div>


        </div>
      </header>

      {/* Main centered draw stage (always full size 3D Carousel) */}
      <main className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full flex flex-col flex-1 h-full">
          <SpotlightGridEngine
            participants={participants}
            onWinnerDrawn={handleWinnerDrawn}
            removeWinnerFromRoster={handleRemoveWinnerFromRoster}
          />
        </div>
      </main>
    </div>
  );
}

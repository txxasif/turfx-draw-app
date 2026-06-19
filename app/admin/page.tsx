"use client";

import { useState, useEffect } from 'react';
import { Participant } from '../types';
import { INITIAL_PRESETS } from '../utils/presets';
import ParticipantManager from '../components/ParticipantManager';
import { Shuffle, ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
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

  // Listen to cross-tab storage changes for real-time syncing
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

  // Save setters
  const updateRoster = (newRoster: Participant[]) => {
    setParticipants(newRoster);
    try {
      localStorage.setItem('luckydraw_participants_v2', JSON.stringify(newRoster));
      // Dispatch storage event manually for same-tab updates
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const handleAddParticipant = (name: string, avatar: string, fbLink?: string, prediction?: string) => {
    const newPerson: Participant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      avatar,
      fbLink,
      prediction,
      addedAt: Date.now(),
    };
    updateRoster([...participants, newPerson]);
  };

  const handleDeleteParticipant = (id: string) => {
    updateRoster(participants.filter((p) => p.id !== id));
  };

  const handleClearParticipants = () => {
    if (confirm('Are you sure you want to clear all participants from the roster?')) {
      updateRoster([]);
    }
  };

  const handleRestorePresets = () => {
    updateRoster(INITIAL_PRESETS);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#020d07] text-slate-200 flex flex-col antialiased items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400 font-display">Loading Admin Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-slate-200 flex flex-col antialiased relative overflow-x-hidden justify-center items-center py-10 px-4"
      style={{
        background: 'repeating-linear-gradient(90deg, #020b05, #020b05 120px, #031208 120px, #031208 240px)',
      }}
    >
      {/* Static stadium light glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* TURFX Header component */}
      <header className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="TURFX Logo" className="h-12 w-auto object-contain hover:scale-105 transition-all duration-300" />
        </div>
        <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mt-1">Entrants Management Room</p>
      </header>

      {/* Main content box */}
      <main className="w-full max-w-xl h-[680px] flex flex-col">
        <ParticipantManager
          participants={participants}
          onAdd={handleAddParticipant}
          onDelete={handleDeleteParticipant}
          onClear={handleClearParticipants}
          onRestorePresets={handleRestorePresets}
        />
      </main>

      <footer className="mt-8 text-center text-[10px] text-slate-500 font-medium font-display uppercase tracking-widest">
        TURFX Live Giveaway &bull; Control Room
      </footer>
    </div>
  );
}

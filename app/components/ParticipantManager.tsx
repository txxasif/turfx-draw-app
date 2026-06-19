"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant } from '../types';
import { AVATAR_POOL } from '../utils/presets';
import { UserPlus, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import FacebookIcon from './FacebookIcon';

interface ParticipantManagerProps {
  participants: Participant[];
  onAdd: (name: string, avatar: string, fbLink?: string, prediction?: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onRestorePresets: () => void;
}

export default function ParticipantManager({
  participants,
  onAdd,
  onDelete,
  onClear,
  onRestorePresets,
}: ParticipantManagerProps) {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fbLink, setFbLink] = useState('');
  const [prediction, setPrediction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Use pasted URL if provided, otherwise pick a random preset from pool
    const finalAvatar = avatarUrl.trim()
      ? avatarUrl.trim()
      : AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

    onAdd(name.trim(), finalAvatar, fbLink.trim() || undefined, prediction.trim() || undefined);
    setName('');
    setAvatarUrl('');
    setFbLink('');
    setPrediction('');
  };

  return (
    <div id="participant-manager-section" className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl p-6 flex flex-col h-full overflow-hidden">
      
      {/* Title Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80 flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            Candidates
            <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono">
              {participants.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage giveaway entrants pool</p>
        </div>
        <div id="action-controls" className="flex items-center gap-1.5">
          <button
            onClick={onRestorePresets}
            className="p-2 text-slate-400 hover:text-lime-400 hover:bg-lime-500/10 rounded-xl transition-all duration-200 cursor-pointer"
            title="Load Presets"
          >
            <RefreshCw size={18} />
          </button>
          {participants.length > 0 && (
            <button
              onClick={onClear}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all duration-200 cursor-pointer"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-4 flex-shrink-0">
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 font-display">
            Entrant Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name (e.g. Liam Watson)"
            className="w-full px-4 py-3 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 text-sm placeholder-slate-600 text-white transition"
            maxLength={24}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 font-display flex justify-between items-center">
            <span>Profile Picture URL</span>
            <span className="text-[10px] text-slate-500 font-normal normal-case">Optional</span>
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Paste image link (e.g. https://...)"
            className="w-full px-4 py-3 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 text-sm placeholder-slate-600 text-white transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 font-display flex justify-between items-center">
            <span>Facebook Profile Link</span>
            <span className="text-[10px] text-slate-500 font-normal normal-case">Optional</span>
          </label>
          <input
            type="url"
            value={fbLink}
            onChange={(e) => setFbLink(e.target.value)}
            placeholder="Paste Facebook link (e.g. https://facebook.com/...)"
            className="w-full px-4 py-3 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 text-sm placeholder-slate-600 text-white transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 font-display flex justify-between items-center">
            <span>Score Prediction</span>
            <span className="text-[10px] text-slate-500 font-normal normal-case">Optional (e.g. ARG 2 - 1 ALG)</span>
          </label>
          <input
            type="text"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="Enter score prediction"
            className="w-full px-4 py-3 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 text-sm placeholder-slate-600 text-white transition"
            maxLength={20}
          />
        </div>

        {/* Link back to draw page */}
        <a
          href="/"
          className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white rounded-2xl font-bold border border-slate-850 hover:border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer mb-5 text-xs text-center font-display"
        >
          🎡 Open Drawing Wheel (Live Draw Room)
        </a>

        <button
          type="submit"
          className="w-full py-3.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black rounded-2xl font-display text-sm tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-lime-500/20"
        >
          <UserPlus size={16} />
          ADD ENTRANT
        </button>
      </form>

      {/* Roster List Label */}
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2.5 flex-shrink-0">
        Entrants list ({participants.length})
      </label>

      {/* Candidates scrolling roster list */}
      <div id="roster-list" className="flex-1 overflow-y-auto pr-1">
        {participants.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30 text-center">
            <ImageIcon size={28} className="text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">No entrants found</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              The pool is empty! Add entrants using the form above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {participants.map((person) => (
                <motion.div
                  key={person.id}
                  id={`participant-item-${person.id}`}
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-center justify-between p-2.5 border border-slate-800/80 bg-slate-950/60 rounded-2xl hover:bg-slate-900/40 transition duration-150 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-800 flex-shrink-0">
                      <img
                        src={person.avatar}
                        alt={person.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 truncate">
                          {person.name}
                        </span>
                        {person.prediction && (
                          <span className="text-[9px] bg-lime-500/10 text-lime-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                            ⚽ {person.prediction}
                          </span>
                        )}
                      </div>
                      {person.fbLink && (
                        <a
                          href={person.fbLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-0.5"
                        >
                          <FacebookIcon size={10} className="fill-sky-400/20" />
                          <span className="truncate max-w-[150px]">{person.fbLink.replace('https://www.facebook.com/', '').replace('https://facebook.com/', '')}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDelete(person.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

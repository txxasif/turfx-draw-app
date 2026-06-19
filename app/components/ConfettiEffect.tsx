"use client";

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square' | 'triangle';
}

const CONFETTI_COLORS = [
  '#FF3B30', // Ruby Red
  '#FF9500', // Amber Orange
  '#FFCC00', // Gold Yellow
  '#34C759', // Emerald Green
  '#5AC8FA', // Sky Blue
  '#007AFF', // Cobalt Blue
  '#5856D6', // Amethyst Violet
  '#AF52DE', // Plum Purple
  '#FF2D55', // Rose Pink
];

export default function ConfettiEffect({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Create initial burst
    const numParticles = 120;
    for (let i = 0; i < numParticles; i++) {
      particles.push(createParticle(canvas.width / 2, canvas.height * 0.45));
    }

    // Keep generating slowly for ambient confetti
    let frameCount = 0;

    function createParticle(startX: number, startY: number): Particle {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 6;
      return {
        x: startX,
        y: startY,
        size: Math.random() * 8 + 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        speedX: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
        speedY: Math.sin(angle) * speed - (Math.random() * 4 + 4), // Initial upward boost
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as any,
      };
    }

    function drawParticle(p: Particle) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    function update() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Add a couple continuous dropping particles from the top/sides
      if (frameCount < 180 && Math.random() < 0.3) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: -10,
          size: Math.random() * 8 + 5,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          speedX: (Math.random() - 0.5) * 3,
          speedY: Math.random() * 2 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
          opacity: 1,
          shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as any,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Gravity & Air Resistance
        p.speedY += 0.22; // Gravity
        p.speedX *= 0.98; // Drag
        p.rotation += p.rotationSpeed;

        // Fade out as it gets low or old
        if (p.y > canvas!.height * 0.7) {
          p.opacity -= 0.015;
        }

        if (p.opacity <= 0 || p.y > canvas!.height + 20) {
          particles.splice(i, 1);
        } else {
          drawParticle(p);
        }
      }

      frameCount++;
      animationId = requestAnimationFrame(update);
    }

    animationId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      id="confetti-canvas"
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

// auth.js — pantalla de acceso (#screen-pw).
// Maneja: canvas de fondo, validacion de clave, transicion a unlock.
// Expone doLogin() global (lo llama el onclick del HTML).

import { ACCESS_KEY } from './state.js';
import { startUnlock } from './unlock.js';

let canvas, ctx, particles = [], rafId = null;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initParticles() {
  particles = [];
  const n = Math.min(60, Math.floor(window.innerWidth / 24));
  for (let i = 0; i < n; i++) {
    particles.push({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r:  Math.random() * 1.2 + 0.3,
      a:  Math.random() * 0.35 + 0.08,
    });
  }
}

function tick() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = canvas.width;  else if (p.x > canvas.width)  p.x = 0;
    if (p.y < 0) p.y = canvas.height; else if (p.y > canvas.height) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(69,216,2,' + p.a + ')';
    ctx.fill();
  }
  // Lineas finas entre puntas cercanas
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 11000) {
        const alpha = (1 - d2 / 11000) * 0.12;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = 'rgba(69,216,2,' + alpha + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
  rafId = requestAnimationFrame(tick);
}

function stopCanvas() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function showError(msg) {
  const err = document.getElementById('pw-err');
  const fld = document.querySelector('.pw-field');
  const input = document.getElementById('pw-in');
  if (err) {
    if (msg) err.textContent = msg;
    err.classList.add('on');
  }
  if (fld) {
    fld.classList.add('shake');
    setTimeout(() => fld.classList.remove('shake'), 500);
  }
  if (input) {
    input.value = '';
    input.focus();
  }
  setTimeout(() => { if (err) err.classList.remove('on'); }, 2400);
}

export function doLogin() {
  const input = document.getElementById('pw-in');
  if (!input) return;
  const val = (input.value || '').trim();
  if (!val) {
    showError('CLAVE REQUERIDA');
    return;
  }
  if (val !== ACCESS_KEY) {
    showError('CLAVE INCORRECTA — ACCESO DENEGADO');
    return;
  }
  const status = document.getElementById('pw-status');
  if (status) {
    status.textContent = 'Autenticado';
    status.style.color = 'var(--green)';
  }
  const screen = document.getElementById('screen-pw');
  if (screen) screen.classList.add('out');
  setTimeout(() => {
    if (screen) screen.style.display = 'none';
    stopCanvas();
    startUnlock();
  }, 800);
}

export function initAuth() {
  canvas = document.getElementById('pw-canvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    initParticles();
    window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
    tick();
  }
  const input = document.getElementById('pw-in');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
    });
  }
  window.doLogin = doLogin;
}
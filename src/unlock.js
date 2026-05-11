// unlock.js — pantalla de carga (#screen-unlock).
// Anima barra de progreso y checks; al terminar dispara la app principal.

import { bootMain } from './main.js';

const STEPS = [
  { pct: 18, status: 'Verificando credenciales',     check: 0 },
  { pct: 36, status: 'Concediendo acceso',           check: 1 },
  { pct: 58, status: 'Indexando actores',            check: 2 },
  { pct: 80, status: 'Construyendo relaciones',      check: 3 },
  { pct: 100,status: 'Interfaz lista',               check: 4 },
];

function setStep(i) {
  const s = STEPS[i];
  const fill   = document.getElementById('ul-fill');
  const pct    = document.getElementById('ul-pct');
  const status = document.getElementById('ul-status');
  if (fill)   fill.style.width = s.pct + '%';
  if (pct)    pct.textContent  = s.pct + '%';
  if (status) status.textContent = s.status;
  for (let k = 0; k <= s.check; k++) {
    const chk = document.querySelector('.ul-chk[data-s="' + k + '"]');
    if (chk) chk.classList.add('done');
  }
}

export function startUnlock() {
  const screen = document.getElementById('screen-unlock');
  if (screen) screen.classList.add('on');

  let i = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = reduced ? 220 : 420;
  const id = setInterval(() => {
    setStep(i);
    i++;
    if (i >= STEPS.length) {
      clearInterval(id);
      setTimeout(() => {
        if (screen) {
          screen.style.transition = 'opacity 0.6s ease';
          screen.style.opacity = '0';
        }
        setTimeout(() => {
          if (screen) {
            screen.classList.remove('on');
            screen.style.display = 'none';
          }
          bootMain();
        }, reduced ? 200 : 650);
      }, reduced ? 250 : 550);
    }
  }, interval);
}

// Registrar globales para que el fallback inline en index.html pueda invocarlos
// si los modulos ES cargan correctamente.
window.__startUnlock__ = startUnlock;
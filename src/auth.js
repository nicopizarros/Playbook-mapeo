import { APP } from './state.js';
import { startUnlock } from './unlock.js';

export function doLogin() {
  const v = document.getElementById('pw-in').value.toLowerCase().trim();
  const err = document.getElementById('pw-err');
  const st = document.getElementById('pw-status');
  if (v === 'playbook2026') {
    err.classList.remove('on');
    if (st) st.textContent = 'Verificando...';
    if (APP._particleRaf) { cancelAnimationFrame(APP._particleRaf); APP._particleRaf = null; }
    document.getElementById('screen-pw').classList.add('out');
    setTimeout(startUnlock, 900);
  } else {
    err.classList.add('on');
    if (st) st.textContent = 'Clave invalida';
    const field = document.getElementById('pw-in');
    field.value = '';
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
    field.focus();
    setTimeout(() => {
      err.classList.remove('on');
      field.classList.remove('shake');
      if (st) st.textContent = 'Esperando autenticacion';
    }, 2800);
  }
}

export function initParticles() {
  const c = document.getElementById('pw-canvas');
  const ctx = c.getContext('2d');
  let pts = [];
  const resize = () => {
    c.width = innerWidth;
    c.height = innerHeight;
    pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      vx: (Math.random() - .5) * .28,
      vy: (Math.random() - .5) * .28,
      r: Math.random() * 1.2 + .4,
    }));
  };
  resize();
  window.addEventListener('resize', resize);
  const draw = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > c.width) p.vx *= -1;
      if (p.y < 0 || p.y > c.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(69,216,2,0.45)';
      ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 130) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(69,216,2,${.07 * (1 - d / 130)})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }
    APP._particleRaf = requestAnimationFrame(draw);
  };
  draw();
}

export function initAuthListeners() {
  document.getElementById('pw-in').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('pw-in').addEventListener('input', () => {
    const st = document.getElementById('pw-status');
    const v = document.getElementById('pw-in').value;
    if (st) st.textContent = v.length > 0 ? 'Clave introducida — ' + v.length + ' caracteres' : 'Esperando autenticacion';
  });
}

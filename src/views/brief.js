import { APP, VX } from '../state.js';
import { openPanel } from '../panel.js';
import { showViewError } from '../data.js';

const DEALFLOW = {
  V1:[{date:'Oct 2024',e:'Multipropiedad desmantelada — presion TAS/FIFA',c:'#ff6b35'},{date:'Nov 2024',e:'Renovacion Adidas-FMF El Tri hasta 2034',c:'#45d802'},{date:'Dic 2025',e:'General Atlantic 49% America — USD 490M EV',c:'#f8961e'},{date:'Feb 2025',e:'Sergio Ramos ficha con Rayados',c:'#45d802'},{date:'Jul 2025',e:'Adidas reemplaza Nike en Club America',c:'#45d802'},{date:'Nov 2025',e:'Apollo compra Atletico de Madrid → San Luis',c:'#f8961e'},{date:'Mar 2026',e:'Estadio Banorte reinaugurado vs Portugal',c:'#4cc9f0'},{date:'Abr 2026',e:'Liga MX se separa de FMF como AC autonoma',c:'#45d802'}],
  V2:[{date:'Ago 2024',e:'Amazon Prime exclusivo Chivas — primer deal su tipo',c:'#00b4d8'},{date:'Jun 2025',e:'Fox Corp adquiere Caliente TV — derechos 6 clubes',c:'#00b4d8'},{date:'Oct 2025',e:'ESPN despidos masivos — control migra a Buenos Aires',c:'#ff4d6d'},{date:'2025',e:'TV Azteca entra en concurso mercantil',c:'#ff4d6d'},{date:'2026',e:'Netflix deal Concacaf — El Tri detras de paywall desde 2027',c:'#00b4d8'}],
  V3:[{date:'2015',e:'BBVA naming Estadio BBVA (15 anos)',c:'#ff6b35'},{date:'2016',e:'BBVA title Liga BBVA MX (hasta 2028)',c:'#ff6b35'},{date:'Mar 2025',e:'Banorte naming Estadio + credito MXN 2,100M',c:'#ff6b35'},{date:'Jul 2025',e:'Adidas primer jersey America. Doble renovacion BBVA',c:'#45d802'},{date:'Oct 2025',e:'Renovacion Caliente+Seleccion Mexicana (4 anos)',c:'#ff6b35'}],
  V4:[{date:'2022',e:'Mikel Arriola consolida poder institucional Liga MX',c:'#c77dff'},{date:'Ago 2025',e:'Live Nation adquiere 75% OCESA — USD 646M',c:'#c77dff'},{date:'Oct 2025',e:'TEAM Marketing AG como socio comercial FMF',c:'#c77dff'},{date:'Mar 2026',e:'Wasserman rebrand a THE-TEAM',c:'#c77dff'},{date:'Abr 2026',e:'Liga MX AC — renegociacion Apollo/SUM proyectada 2028',c:'#c77dff'}],
  V5:[{date:'Jul 2025',e:'Mundomex: mandato On Location/FIFA Mexico',c:'#ffd60a'},{date:'Jul 2025',e:'Elevate Sports Ventures: contrato 10 anos Banorte',c:'#ffd60a'},{date:'Feb 2026',e:'Fuse Mexico: lanzamiento Omnicom',c:'#ffd60a'},{date:'Abr 2026',e:'Muerte Burillo Azcarraga — vacante ATP 500',c:'#ff4d6d'},{date:'Jun 2026',e:'On Location WC26 — monopolio hospitality',c:'#ffd60a'}],
  V6:[{date:'Nov 2022',e:'Incode Fan ID Liga MX — biometria obligatoria',c:'#ff4d6d'},{date:'Dic 2025',e:'Fanki desplaza a Ticketmaster en Estadio Banorte',c:'#ff4d6d'},{date:'Feb 2026',e:'Profeco vs Ticketmaster / Viagogo / HelloTicket',c:'#ff4d6d'},{date:'Abr 2026',e:'FIFA Ticketing digital-only WC26 Mexico',c:'#ff4d6d'},{date:'Jun 2026',e:'5 partidos WC26 Banorte bajo Fanki',c:'#45d802'}],
  V7:[{date:'2015',e:'Estadio BBVA inaugurado — USD 200M — LEED Silver',c:'#4cc9f0'},{date:'Mar 2025',e:'Naming Banorte firmado + credito estructurado',c:'#4cc9f0'},{date:'Jul 2025',e:'Elevate Sports Ventures — contrato 10 anos Banorte',c:'#4cc9f0'},{date:'Oct 2025',e:'Arena Guadalajara Avalanz inaugura — triangulo completo',c:'#4cc9f0'},{date:'Nov 2025',e:'Alexandre Costa nuevo DG Estadio Banorte',c:'#4cc9f0'},{date:'Mar 2026',e:'Reapertura Estadio Banorte — LEED Platinum',c:'#45d802'},{date:'Jun 2026',e:'WC26 — partido inaugural Mexico vs Sudafrica',c:'#45d802'}],
  V8:[{date:'Nov 2020',e:'Genius Sports — mandato exclusivo Liga MX',c:'#06d6a0'},{date:'Abr 2022',e:'Second Spectrum (Genius) — acuerdo Necaxa tracking',c:'#06d6a0'},{date:'Nov 2022',e:'Incode Fan ID — biometria acceso estadios',c:'#06d6a0'},{date:'Dic 2025',e:'KAGR entra en America via deal General Atlantic',c:'#06d6a0'},{date:'Ene 2026',e:'SAOT Genius Sports — 18 estadios Liga MX',c:'#06d6a0'},{date:'Jun 2026',e:'Hawk-Eye (Sony) opera VAR oficial WC26 venues MX',c:'#4cc9f0'}],
  V9:[{date:'1999',e:'FEMSA adquiere Rayados de Monterrey',c:'#f8961e'},{date:'Sep 2024',e:'Caliente Interactive JV Playtech renegociado — USD 900M-1,200M',c:'#f8961e'},{date:'Oct 2025',e:'Apollo Sports Capital compra Atletico de Madrid',c:'#f8961e'},{date:'Dic 2025',e:'General Atlantic 49% Grupo Aguilas — USD 490M EV',c:'#f8961e'},{date:'2025',e:'Innovatio Capital compra Queretaro USD 120M',c:'#f8961e'},{date:'Abr 2026',e:'Grupo PRODI compra Atlas ~USD 220M / Atlante ascenso ~USD 65M',c:'#f8961e'}],
};

function fmtScore(n) {
  if (n === null || n === undefined || typeof n !== 'number') return '';
  return (n * 100).toFixed(0) + '%';
}

function shortTipo(t) {
  if (!t) return '';
  return t.split('(')[0].trim();
}

export function dealFlowHtml(v) {
  const items = DEALFLOW[v] || [];
  if (!items.length) return '';
  return `<div class="brief-sec" style="margin-top:24px">Deal flow · Hitos clave</div><div class="df-wrap"><div class="df-track">${items.map(i => `<div class="df-item"><div class="df-dot" style="background:${i.c};border-color:${i.c}"></div><div class="df-date">${i.date}</div><div class="df-event">${i.e}</div></div>`).join('')}</div></div>`;
}

export function buildBrief() {
  const nav = document.getElementById('brief-nav');
  if (nav && nav.children.length === 0) {
    Object.entries(VX).forEach(([k, v], i) => {
      const d = document.createElement('div');
      d.className = 'bn-item' + (i === 0 ? ' on' : '');
      d.dataset.v = k;
      d.textContent = k + ' · ' + v.label;
      d.onclick = () => {
        document.querySelectorAll('.bn-item').forEach(x => x.classList.remove('on'));
        d.classList.add('on');
        renderBrief(k);
      };
      nav.appendChild(d);
    });
    document.getElementById('brief-body').addEventListener('click', e => {
      if (e.target.closest('.bac-cta')) return;
      const card = e.target.closest('[data-aid]');
      if (card) { const a = APP.actorMap.get(card.dataset.aid); if (a) openPanel(a, 'br-panel'); }
    });
  }
  renderBrief('V1');
}

export function renderBrief(v) {
  try {
    const vc = VX[v] || VX.V1;
    const va = APP.ACTORS.filter(a => a.vertical === v);
    const t1 = va.filter(a => a.tier === 1), t2 = va.filter(a => a.tier === 2), t3 = va.filter(a => a.tier === 3);
    document.getElementById('brief-body').innerHTML = `
    <div class="bv-hero">
      <div class="bv-eye">${v} · Playbook Sports Intelligence · MX 2026</div>
      <div class="bv-title" style="color:${vc.color}">${vc.label.toUpperCase()}</div>
      <div class="bv-q">${vc.q}</div>
      <div class="bv-note">${vc.note}</div>
      <div class="bv-stats">
        <div><div class="bv-stat-n" style="color:${vc.color}">${t1.length}</div><div class="bv-stat-l">Tier 1</div></div>
        <div><div class="bv-stat-n" style="color:var(--text-muted)">${t2.length}</div><div class="bv-stat-l">Tier 2</div></div>
        <div><div class="bv-stat-n" style="color:var(--text-dim)">${t3.length}</div><div class="bv-stat-l">Tier 3</div></div>
        <div><div class="bv-stat-n" style="color:var(--text-muted)">${va.length}</div><div class="bv-stat-l">Total</div></div>
      </div>
    </div>
    ${t1.length ? `<div class="brief-sec">Tier 1 — Actores dominantes</div><div class="b-grid">${t1.map(a => {
      const sc = fmtScore(a.score_compuesto);
      const tc = shortTipo(a.tipo_capacidad);
      const scoreLine = sc ? `<div class="bac-v">Score ${sc}${tc ? ' · ' + tc : ''}</div>` : '';
      return `<div class="bac" data-aid="${a.id}"><div class="bac-n">${a.label}</div><div class="bac-r">${a.role}</div>${scoreLine}<span class="bac-b">● ${a.certeza}</span>${a.signal ? `<div class="bac-sig" id="bsig-${a.id}"><em>${a.signal}</em></div><div class="bac-cta" onclick="expandBacSig(event,'bsig-${a.id}',this)">Ver senal completa →</div>` : ''}</div>`;
    }).join('')}</div>` : ''}
    ${t2.length ? `<div class="brief-sec" style="margin-top:22px">Tier 2 — Actores relevantes</div><div style="display:flex;flex-direction:column;gap:7px;margin-bottom:26px">${t2.map(a => `<div style="display:flex;align-items:flex-start;gap:14px;padding:11px 13px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.055);cursor:pointer" data-aid="${a.id}"><div style="flex:1"><div style="font-family:var(--display);font-size:14px;font-weight:700;color:var(--text);margin-bottom:2px">${a.label}</div><div style="font-family:var(--sans);font-size:11px;color:var(--text-muted);font-weight:300">${a.role}</div></div><div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);flex-shrink:0">${a.ciudad || '—'}</div></div>`).join('')}</div>` : ''}
    ${t3.length ? `<div class="brief-sec" style="margin-top:8px">Tier 3 — Actores especializados</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:32px">${t3.map(a => `<div style="padding:7px 11px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.055);cursor:pointer;font-family:var(--mono);font-size:8px;letter-spacing:0.08em;color:var(--text-muted);text-transform:uppercase" data-aid="${a.id}">${a.label}</div>`).join('')}</div>` : ''}
    ${va.length === 0 ? `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:40px 0">Sin actores registrados para ${v}.</div>` : ''}
    ${dealFlowHtml(v)}`;
  } catch(err) {
    console.error('renderBrief error:', err);
    showViewError('view-brief', () => renderBrief(v));
  }
}

export function expandBacSig(e, sigId, btn) {
  e.stopPropagation();
  const sig = document.getElementById(sigId); if (!sig) return;
  const expanded = sig.classList.toggle('expanded');
  if (btn) btn.textContent = expanded ? 'Ver menos ↑' : 'Ver senal completa →';
}
import actorsData from '../actors.json' assert { type: 'json' };
import clustersData from '../clusters.json' assert { type: 'json' };

export const config = { runtime: 'edge' };

// Build compressed ecosystem digest at module load time (not per-request)
function buildActorDigest(actors) {
  return actors.map(a => {
    const signal = (a.known_for || a.que_hace || '').replace(/\n/g, ' ').slice(0, 90);
    return `${a.id}|${a.label}|${a.vertical}|T${a.tier}|${signal}`;
  }).join('\n');
}

function buildClusterDigest(clusters) {
  return clusters.map((cl, i) => {
    const ids = (cl.actor_ids || []).join(', ');
    const name = (cl.nombre || '').replace(/^Cluster /, '');
    return `${i + 1}. ${name} — IDs: ${ids}`;
  }).join('\n');
}

const ACTOR_DIGEST = buildActorDigest(actorsData);
const CLUSTER_DIGEST = buildClusterDigest(clustersData);

const SYSTEM = `Eres el motor de inteligencia de Playbook Sports Intelligence — plataforma de análisis del ecosistema deportivo mexicano 2026. Tienes acceso a datos de 191 actores en 9 verticales.

VERTICALES:
V1=Propiedades (clubes, ligas, federaciones, selecciones)
V2=Media (broadcasters, streamers, productoras, medios digitales)
V3=Sponsors (marcas, naming rights, capital comercial)
V4=Activación (agencias, rights managers, intermediarios)
V5=Experiencias (promotores, hospitality, fan experience, travel premium)
V6=Ticketing (boleteras, plataformas de acceso, biometría, reventa)
V7=Venues (estadios, arenas, recintos, concesionarios)
V8=Tecnología (data, analytics, performance tech, VAR, fan tech)
V9=Capital (PE, fondos, propietarios, holdings, deal architecture)

ACTORES DEL ECOSISTEMA — formato: ID|Nombre|Vertical|Tier|Señal clave:
${ACTOR_DIGEST}

CLUSTERS DE PODER (agrupaciones por control estructural):
${CLUSTER_DIGEST}

REGLAS OBLIGATORIAS:
1. Responde EXCLUSIVAMENTE sobre el ecosistema deportivo mexicano 2026. Si la pregunta está fuera de alcance, declínala con una frase breve y sugiere una pregunta relacionada al ecosistema.
2. Cita actores por su ID entre paréntesis al mencionarlos — ej. "Club América (V1-001)" o simplemente "V1-001".
3. Estructura SIEMPRE tus respuestas con este formato exacto:
   TITULAR: [una oración en mayúsculas que resume el hallazgo principal]

   [Cuerpo analítico: 2-4 párrafos con profundidad estratégica]

   ACTORES RELACIONADOS: V1-001, V2-005, V9-003
4. Cuando haya incertidumbre o datos insuficientes, prefixa la afirmación con "DATO INCIERTO:" o usa "SIN DATOS SUFICIENTES PARA CONFIRMAR".
5. Responde siempre en español.
6. No inventes valoraciones, porcentajes, relaciones ni datos que no estén en el contexto proporcionado.
7. Usa lenguaje analítico, directo, sin adornos. Estilo intelligence brief.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Same-origin validation: reject if origin header is present but doesn't match host
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      const originHostname = new URL(origin).hostname;
      const reqHostname = host.split(':')[0];
      // Allow same host or subdomains (for Vercel preview URLs etc.)
      if (originHostname !== reqHostname && !originHostname.endsWith('.' + reqHostname) && !reqHostname.endsWith('.' + originHostname)) {
        return new Response('Forbidden', { status: 403 });
      }
    } catch {
      // Malformed origin header — reject
      return new Response('Forbidden', { status: 403 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request: invalid JSON', { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Bad request: messages must be a non-empty array', { status: 400 });
  }

  // Sanitize: only user/assistant roles, string content, no system prompt injection
  const safeMessages = messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) })); // cap per-message length

  if (safeMessages.length === 0) {
    return new Response('Bad request: no valid messages', { status: 400 });
  }

  // Ensure conversation starts with user message (Anthropic requirement)
  if (safeMessages[0].role !== 'user') {
    return new Response('Bad request: first message must be from user', { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('Service unavailable: API not configured', { status: 503 });
  }

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM,
        messages: safeMessages,
        stream: true,
      }),
    });
  } catch (err) {
    return new Response('Upstream fetch failed', { status: 502 });
  }

  if (!upstream.ok) {
    return new Response('Upstream error: ' + upstream.status, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': origin || '*',
    },
  });
}

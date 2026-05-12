// state.js — estado global compartido, constantes de verticales, logo.
// No depende de otros modulos. Es la primera importacion en la cadena.

export const APP = {
  // Datos crudos y adaptados (los carga data.js -> loadData)
  ACTORS:       [],
  EDGES:        [],
  EDGES_RAW:    [],
  POI:          {},
  CLUSTERS:     [],
  TICKER_DATA:  [],
  actorMap:     new Map(),

  // Vista actual
  curView: 'network',

  // Filtros
  activeV: null,
  idxF:    null,

  // Hover / seleccion
  hoveredId: null,

  // Indice (sort)
  sortCol: 'label',
  sortDir: 1,

  // Red (network.js)
  netLayout:        'red',
  simulation:       null,
  svgSel:           null,
  zoomBehavior:     null,
  gMain:            null,
  gClusterBg:       null,
  gVLaneBg:         null,
  gFixedHeaders:    null,
  nodeSel:          null,
  linkSel:          null,
  labelSel:         null,
  netNodeData:      [],
  netNodeGroups:    null,
  netClean:         true,
  nodeClusterMap:   new Map(),
  nodeClusterLabel: new Map(),
  clusterCentroids: new Map(),

  // Clusters
  selectedCluster: null,
  _clustersBuilt:  false,
};

// Verticales: codigo, nombre corto, color (alineado con --v1..--v9 del CSS)
export const VX = {
  V1: { code:'V1', label:'Rights Owners',     color:'var(--v1)', q:'¿Quién controla los derechos deportivos en México?', note:'Clubes, federaciones y ligas que poseen y monetizan activos deportivos.' },
  V2: { code:'V2', label:'Media',             color:'var(--v2)', q:'¿Cómo se distribuye y consume el deporte en medios?',  note:'Broadcasters, plataformas digitales y productoras de contenido deportivo.' },
  V3: { code:'V3', label:'Comercializacion',  color:'var(--v3)', q:'¿Quién activa las marcas en el ecosistema deportivo?', note:'Sponsors, naming rights y agencias de activación de marca.' },
  V4: { code:'V4', label:'Agencies & Talent', color:'var(--v4)', q:'¿Cómo fluye el talento y la representación en el deporte MX?', note:'Agencias de representación, management y consultoría estratégica.' },
  V5: { code:'V5', label:'Events',            color:'var(--v5)', q:'¿Quién produce y opera los grandes eventos deportivos?', note:'Promotoras, productoras de experiencias y gestión de hospitality.' },
  V6: { code:'V6', label:'Ticketing',         color:'var(--v6)', q:'¿Cómo se gestiona el acceso y la monetización de asistencia?', note:'Plataformas de venta, control de acceso y tecnología de fan ID.' },
  V7: { code:'V7', label:'Infrastructure',    color:'var(--v7)', q:'¿Qué infraestructura sostiene el deporte de alto rendimiento?', note:'Estadios, arenas, centros de entrenamiento y operadores de venue.' },
  V8: { code:'V8', label:'Sports Tech',       color:'var(--v8)', q:'¿Qué tecnología transforma el deporte en México?', note:'Data, analytics, wearables, VAR y plataformas de fan engagement.' },
  V9: { code:'V9', label:'Capital',           color:'var(--v9)', q:'¿Quién financia y adquiere activos deportivos en México?', note:'Fondos de inversión, family offices y corporativos con exposición al deporte.' },
};

// Logo oficial Playbook: forzar PNG en toda la app.
export const LOGO = 'logo.png';

export const RIESGO_DEFAULT = 'Sin riesgo identificado';

// Clave de acceso. Cambiala por la que uses en produccion.
export const ACCESS_KEY = 'playbook2026';

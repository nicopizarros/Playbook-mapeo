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
  nodeClusterMap:   new Map(),
  nodeClusterLabel: new Map(),
  clusterCentroids: new Map(),

  // Clusters
  selectedCluster: null,
  _clustersBuilt:  false,
};

// Verticales: codigo, nombre corto, color (alineado con --v1..--v9 del CSS)
export const VX = {
  V1: { code:'V1', name:'Rights Owners',     color:'var(--v1)' },
  V2: { code:'V2', name:'Media',             color:'var(--v2)' },
  V3: { code:'V3', name:'Comercializacion',  color:'var(--v3)' },
  V4: { code:'V4', name:'Agencies & Talent', color:'var(--v4)' },
  V5: { code:'V5', name:'Events',            color:'var(--v5)' },
  V6: { code:'V6', name:'Ticketing',         color:'var(--v6)' },
  V7: { code:'V7', name:'Infrastructure',    color:'var(--v7)' },
  V8: { code:'V8', name:'Sports Tech',       color:'var(--v8)' },
  V9: { code:'V9', name:'Capital',           color:'var(--v9)' },
};

// Logo oficial Playbook: wordmark blanco + corner mark verde.
// SVG inline (vectorial, escalable, sin pixelado). viewBox 1040x310 mantiene la proporcion del original.
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 310" preserveAspectRatio="xMidYMid meet">' +
    '<g fill="#ffffff" font-family="Syne, Inter, system-ui, sans-serif" font-weight="800">' +
      '<text x="0" y="240" font-size="280" letter-spacing="-8">Playbook</text>' +
    '</g>' +
    // Corner mark verde arriba a la derecha (L invertida)
    '<g fill="#90E840">' +
      '<rect x="900" y="40" width="100" height="28"/>' +
      '<rect x="972" y="40" width="28" height="130"/>' +
    '</g>' +
  '</svg>';

export const LOGO = 'data:image/svg+xml;base64,' + btoa(LOGO_SVG);

// Clave de acceso. Cambiala por la que uses en produccion.
export const ACCESS_KEY = 'playbook2026';
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Playbook Intelligence — Ecosistema Deportivo MX 2026</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
</head>
<body>

<div id="screen-pw">
  <canvas id="pw-canvas"></canvas>
  <div class="pw-hline t"></div><div class="pw-hline b"></div>
  <div class="pw-vline l"></div><div class="pw-vline r"></div>
  <div class="pw-tick tl"></div><div class="pw-tick tr"></div>
  <div class="pw-tick bl"></div><div class="pw-tick br"></div>
  <div class="pw-meta tl">PB-INTEL // MX-ECO-2026<br>CLASIFICACION: RESTRINGIDO<br>PROTOCOLO DE ACCESO ACTIVO</div>
  <div class="pw-meta tr">CORTE: 11.MAY.2026<br>SESION NO INICIADA<br>NODE: MX-PROD-01</div>
  <div class="pw-meta bl">© 2026 PLAYBOOK SPORTS INTELLIGENCE<br>DISTRIBUCION RESTRINGIDA · USO INTERNO</div>
  <div class="pw-meta br">v1.00.31 // BUILD 11MAY26<br>149 ACTORES · 9 VERTICALES</div>
  <div class="pw-center">
    <div class="pw-logo-wrap">
      <img id="pw-logo" class="pw-logo" alt="Playbook Intelligence">
      <div class="pw-logo-sub">Sports Intelligence · Ecosistema Deportivo MX · 2026</div>
    </div>
    <div class="pw-sep">
      <div class="pw-sep-line l"></div><div class="pw-sep-dot"></div>
      <div class="pw-sep-txt">Acceso restringido</div>
      <div class="pw-sep-dot"></div><div class="pw-sep-line r"></div>
    </div>
    <div class="pw-form">
      <div class="pw-lbl-row">
        <div class="pw-lbl">Clave de acceso</div>
        <div class="pw-lbl-status" id="pw-status">Esperando autenticacion</div>
      </div>
      <div class="pw-field">
        <div class="pw-field-inner">
          <input type="password" id="pw-in" maxlength="24" autocomplete="off" spellcheck="false" placeholder="· · · · · · · · · ·" aria-label="Clave de acceso" autofocus>
          <div class="pw-field-accent"></div>
        </div>
      </div>
      <div class="pw-err" id="pw-err">CLAVE INCORRECTA — ACCESO DENEGADO</div>
      <button class="pw-btn" onclick="doLogin()">
        <div class="pw-btn-fill"></div>
        <span class="pw-btn-text">Verificar acceso →</span>
      </button>
      <div class="pw-foot">Uso exclusivo de usuarios autorizados<br>Playbook Sports Intelligence · Mexico · 2026<br><em>Sesion encriptada · Acceso auditado</em></div>
    </div>
  </div>
</div>

<div id="screen-unlock">
  <img id="ul-logo" class="ul-logo" alt="Playbook Intelligence">
  <div class="ul-wrap">
    <div class="ul-lbl" id="ul-lbl">Iniciando sesion</div>
    <div class="ul-track"><div class="ul-fill" id="ul-fill"></div></div>
    <div class="ul-pct" id="ul-pct">0%</div>
    <div class="ul-status" id="ul-status"></div>
  </div>
  <div class="ul-checks" id="ul-checks">
    <div class="ul-chk" data-s="0"><div class="ul-chk-dot"></div>Credenciales verificadas</div>
    <div class="ul-chk" data-s="1"><div class="ul-chk-dot"></div>Acceso al ecosistema concedido</div>
    <div class="ul-chk" data-s="2"><div class="ul-chk-dot"></div>149 actores indexados</div>
    <div class="ul-chk" data-s="3"><div class="ul-chk-dot"></div>Red de relaciones construida</div>
    <div class="ul-chk" data-s="4"><div class="ul-chk-dot"></div>Interfaz lista</div>
  </div>
</div>

<div id="screen-main">
  <nav class="sidebar">
    <div class="sb-head">
      <img id="sb-logo" class="sb-logo" alt="Playbook Intelligence">
      <div class="sb-tagline">Ecosistema Deportivo · MX · 2026</div>
      <button class="sb-close" onclick="closeSidebar()" aria-label="Cerrar menu">✕</button>
    </div>
    <div class="sb-scroll">
      <div class="sb-sec">Vistas</div>
      <div class="sb-item active" data-view="network" onclick="switchView('network',this)"><div class="sb-dot" style="background:var(--green)"></div><span class="sb-lbl">Red de actores</span></div>
      <div class="sb-item" data-view="index" onclick="switchView('index',this)"><div class="sb-dot" style="background:var(--v2)"></div><span class="sb-lbl">Indice</span></div>
      <div class="sb-item" data-view="brief" onclick="switchView('brief',this)"><div class="sb-dot" style="background:var(--v4)"></div><span class="sb-lbl">Briefings</span></div>
      <div class="sb-item" data-view="clusters" onclick="switchView('clusters',this)"><div class="sb-dot" style="background:var(--v4)"></div><span class="sb-lbl">Clusters ejecutivos</span></div>
      <div class="sb-sec" style="margin-top:4px">Verticales</div>
      <div class="sb-item" onclick="filterV('V1')" id="sv-V1"><div class="sb-dot" style="background:var(--v1)"></div><span class="sb-lbl">V1 Rights Owners</span><span class="sb-cnt" id="sc-V1"></span></div>
      <div class="sb-item" onclick="filterV('V2')" id="sv-V2"><div class="sb-dot" style="background:var(--v2)"></div><span class="sb-lbl">V2 Media</span><span class="sb-cnt" id="sc-V2"></span></div>
      <div class="sb-item" onclick="filterV('V3')" id="sv-V3"><div class="sb-dot" style="background:var(--v3)"></div><span class="sb-lbl">V3 Comercializacion</span><span class="sb-cnt" id="sc-V3"></span></div>
      <div class="sb-item" onclick="filterV('V4')" id="sv-V4"><div class="sb-dot" style="background:var(--v4)"></div><span class="sb-lbl">V4 Agencies &amp; Talent</span><span class="sb-cnt" id="sc-V4"></span></div>
      <div class="sb-item" onclick="filterV('V5')" id="sv-V5"><div class="sb-dot" style="background:var(--v5)"></div><span class="sb-lbl">V5 Events</span><span class="sb-cnt" id="sc-V5"></span></div>
      <div class="sb-item" onclick="filterV('V6')" id="sv-V6"><div class="sb-dot" style="background:var(--v6)"></div><span class="sb-lbl">V6 Ticketing</span><span class="sb-cnt" id="sc-V6"></span></div>
      <div class="sb-item" onclick="filterV('V7')" id="sv-V7"><div class="sb-dot" style="background:var(--v7)"></div><span class="sb-lbl">V7 Infrastructure</span><span class="sb-cnt" id="sc-V7"></span></div>
      <div class="sb-item" onclick="filterV('V8')" id="sv-V8"><div class="sb-dot" style="background:var(--v8)"></div><span class="sb-lbl">V8 Sports Tech</span><span class="sb-cnt" id="sc-V8"></span></div>
      <div class="sb-item" onclick="filterV('V9')" id="sv-V9"><div class="sb-dot" style="background:var(--v9)"></div><span class="sb-lbl">V9 Capital</span><span class="sb-cnt" id="sc-V9"></span></div>
    </div>
    <div class="sb-foot"><div class="sb-foot-txt">CORTE: MAY 2026<br>149 ACTORES · v1.00.31<br>9 VERTICALES MAPEADAS</div></div>
  </nav>
  <div class="main-area" role="main">
    <div class="topbar">
      <button class="menu-toggle" id="menu-toggle" onclick="toggleSidebar()" aria-label="Abrir menu">☰</button>
      <div class="tb-crumb" id="tb-crumb">Mapa <em>/ Red de actores</em></div>
      <div class="tb-search"><span class="tb-si">⌕</span><input type="text" placeholder="Buscar actor..." id="srch" aria-label="Buscar actor" oninput="onSearch(this.value)"></div><span id="srch-count"></span>
      <div class="tb-right"><div class="tb-badge">Restringido</div><div class="tb-date" id="tb-date"></div></div>
    </div>
    <div class="view-tabs">
      <div class="vt active" data-view="network" onclick="switchView('network',null,this)">Mapa de actores</div>
      <div class="vt" data-view="index" onclick="switchView('index',null,this)">Indice maestro</div>
      <div class="vt" data-view="brief" onclick="switchView('brief',null,this)">Briefings verticales</div>
      <div class="vt" data-view="clusters" onclick="switchView('clusters',null,this)">Clusters ejecutivos</div>
    </div>
    <div class="view-wrap">
      <div id="view-network">
        <div id="net-svg-wrap" style="width:100%;height:100%;position:relative;overflow:hidden">
          <svg id="net-svg" style="width:100%;height:100%;display:block"></svg>
          <div id="net-loading-overlay">
            <div class="net-load-dot"></div>
            <div class="net-load-txt">CARGANDO RED...</div>
          </div>
        </div>
        <div class="net-layout-btns">
          <button class="net-lb active" id="nlb-red" onclick="setNetLayout('red')">Red</button>
          <button class="net-lb" id="nlb-clusters" onclick="setNetLayout('clusters')">Clusters</button>
          <button class="net-lb" id="nlb-verticales" onclick="setNetLayout('verticales')">Verticales</button>
        </div>
        <div class="net-ctrl-grp">
          <button class="net-cb" onclick="netZoom(1.25)" title="Acercar">+</button>
          <button class="net-cb" onclick="netZoom(0.8)" title="Alejar">−</button>
          <button class="net-cb" onclick="netReset()" style="font-size:9px;letter-spacing:0" title="Reset">⌖</button>
        </div>
        <div id="minimap"><canvas id="minimap-canvas"></canvas><div id="minimap-viewport"></div><div class="minimap-label">Vista general</div></div>
        <div id="zoom-badge">100%</div>
        <div class="net-legend">
          <div class="leg-t">Leyenda</div>
          <div class="leg-i"><div class="leg-d" style="width:11px;height:11px;background:var(--green);box-shadow:0 0 7px var(--green-glow)"></div>Tier 1</div>
          <div class="leg-i"><div class="leg-d" style="width:7px;height:7px;background:#4a4a4a"></div>Tier 2</div>
          <div class="leg-i"><div class="leg-d" style="width:4px;height:4px;background:#2a2a2a"></div>Tier 3</div>
          <div class="leg-i" style="margin-top:5px"><div style="width:16px;height:1px;background:rgba(69,216,2,0.55)"></div>Relacion directa</div>
          <div class="leg-i"><div style="width:16px;height:1px;background:rgba(255,255,255,0.12)"></div>Conexion V-V</div>
        </div>
        <div class="net-mobile-hint">Pellizca para hacer zoom · Toca un nodo para ver ficha</div>
        <div class="net-tt" id="net-tt">
          <div class="net-tt-name" id="tt-n"></div>
          <div class="net-tt-v" id="tt-v"></div>
          <div class="net-tt-role" id="tt-r"></div>
          <div class="net-tt-hint">Click para ficha completa</div>
          <div id="tt-cluster" style="font-family:var(--mono);font-size:7px;color:var(--green);letter-spacing:0.1em;margin-top:5px;display:none"></div>
        </div>
        <div class="actor-panel" id="net-panel">
          <div class="ap-top"><div class="ap-x" onclick="closeP('net-panel')">✕</div><div class="ap-vtag" id="np-vt"></div><div class="ap-name" id="np-n"></div><div class="ap-role" id="np-r"></div></div>
          <div class="ap-body" id="np-b"></div>
        </div>
      </div>
      <div id="view-index">
        <div class="idx-bar">
          <span class="idx-bl">Filtrar:</span>
          <div class="idx-chips" id="idx-chips"></div>
          <div class="idx-cnt" id="idx-cnt"></div>
        </div>
        <table class="idx-tbl" id="idx-tbl">
          <thead><tr>
            <th onclick="sortIdx('label')" data-col="label">Actor</th>
            <th onclick="sortIdx('vertical')" data-col="vertical">Vertical</th>
            <th onclick="sortIdx('tier')" data-col="tier">Tier</th>
            <th onclick="sortIdx('ciudad')" data-col="ciudad">Ciudad</th>
            <th onclick="sortIdx('score_compuesto')" data-col="score_compuesto">Score</th>
            <th onclick="sortIdx('certeza')" data-col="certeza">Certeza</th>
            <th>Senal clave</th>
          </tr></thead>
          <tbody id="idx-body"></tbody>
        </table>
        <div class="actor-panel" id="idx-panel">
          <div class="ap-top"><div class="ap-x" onclick="closeP('idx-panel')">✕</div><div class="ap-vtag" id="ip-vt"></div><div class="ap-name" id="ip-n"></div><div class="ap-role" id="ip-r"></div></div>
          <div class="ap-body" id="ip-b"></div>
        </div>
      </div>
      <div id="view-brief">
        <div class="brief-nav" id="brief-nav"></div>
        <div class="brief-body" id="brief-body"></div>
        <div class="actor-panel" id="br-panel">
          <div class="ap-top"><div class="ap-x" onclick="closeP('br-panel')">✕</div><div class="ap-vtag" id="bp-vt"></div><div class="ap-name" id="bp-n"></div><div class="ap-role" id="bp-r"></div></div>
          <div class="ap-body" id="bp-b"></div>
        </div>
      </div>
      <div id="view-clusters">
        <div class="cl-split">
          <div class="cl-list" id="cl-list"></div>
          <div class="cl-detail" id="cl-detail"><div class="cl-detail-empty">Selecciona un cluster</div></div>
        </div>
        <div class="actor-panel" id="cluster-panel">
          <div class="ap-top"><div class="ap-x" onclick="closeP('cluster-panel')">✕</div><div class="ap-vtag" id="cp-vt"></div><div class="ap-name" id="cp-n"></div><div class="ap-role" id="cp-r"></div></div>
          <div class="ap-body" id="cp-b"></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="sb-overlay" class="sb-overlay" onclick="closeSidebar()"></div>
<div class="ticker" id="ticker"><div class="ticker-lbl">Senales</div><div class="ticker-scroll"><div class="ticker-track" id="tk-track"></div></div></div>

<script type="module" src="src/main.js"></script>
</body>
</html>

# Playbook Sports Intelligence — Ecosistema Deportivo MX 2026

Visualization platform for the Mexican sports business ecosystem. Deployed on Vercel via GitHub.

## Repository structure

```
playbook-ecosistema/
├── index.html              ← UI shell (no hardcoded data — fetches from /data)
├── data/
│   ├── actors.json         ← 191 actors (from Universo Maestro)
│   ├── edges.json          ← 127 relationships (from Mapa de Conexiones)
│   ├── poi.json            ← 121 POIs grouped by actor ID
│   └── clusters.json       ← 10 power clusters
└── scripts/
    └── build_data.py       ← Generates all /data/*.json from the source XLSXs
```

## Updating the data

When either source XLSX is updated, run the build script locally:

```bash
python scripts/build_data.py \
  --tracker  "path/to/Mapeo_Tracker_Final_X_XX.xlsx" \
  --conexiones "path/to/Playbook_Mapeo_Conexiones_Expandido_XXXX.xlsx"
```

This overwrites the four JSON files in `/data/`. Commit and push — Vercel deploys automatically.

**Requirements:** `pip install openpyxl`

## Data sources

| File | Source sheet | Records |
|------|-------------|---------|
| `actors.json` | Universo Maestro | 191 actors |
| `edges.json` | Mapa de Conexiones | 127 relationships |
| `poi.json` | POI Maestro | 121 people across 80 actors |
| `clusters.json` | Clusters de Poder | 10 power clusters |

## Deployment

Push to `main` → Vercel auto-deploys. No build step required (pure static files).

Vercel settings: Framework = **Other**, Output directory = **`./`** (root).

## Actor ID schema

All actors use the canonical `V1-001` style IDs from the Tracker. The visualization uses these IDs directly — no remapping layer.

Vertical codes:
- `V1` Propiedades · `V2` Media · `V3` Sponsors · `V4` Activación
- `V5` Experiencias · `V6` Ticketing · `V7` Venues · `V8` Tecnología · `V9` Capital

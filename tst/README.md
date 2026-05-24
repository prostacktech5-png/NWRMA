# NWRMA Website (React)

National Water Resources Management Agency — Sierra Leone. Rebuilt as a React + Vite application (no WordPress).

## Setup

```bash
npm install --legacy-peer-deps
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Re-crawl live site content

```bash
npm run crawl
python scripts/build_site_map.py
```

Content pages are stored in `src/data/pages/*.json` (extracted from crawled HTML).

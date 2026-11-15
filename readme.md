<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/svg/vigia-logo-horizontal-oscuro.svg">
  <img src="docs/brand/svg/vigia-logo-horizontal-claro.svg" alt="VIGÍA" width="320">
</picture>

# VIGÍA

**Know how you are and what to do next, without waiting for Earth.** A crew self-health monitor for long missions with communication delay. NASA Space Apps Challenge 2026, challenge *Create Health Monitoring Software for Astronauts on Space Missions*.

- **Live app:** https://vigia.smoraleslo.dev (demo scenario in English: https://vigia.smoraleslo.dev/?modo=demo&lang=en)
- **Final project report (English):** [auditoria/FINAL-PROJECT-REPORT.md](auditoria/FINAL-PROJECT-REPORT.md) · glossary: [auditoria/GLOSARIO.md](auditoria/GLOSARIO.md)
- **Informe final del proyecto (español):** [auditoria/INFORME-FINAL-DEL-PROYECTO.md](auditoria/INFORME-FINAL-DEL-PROYECTO.md) · presentaciones en inglés y español en [auditoria/](auditoria/)
- **Technical report (Spanish, supplementary):** [documentacion/](documentacion/)
- **Companion repository (watch):** [smoraleslo/smart-monitor](https://github.com/smoraleslo/smart-monitor), see [Related repository](#related-repository-smart-monitor)
- VIGÍA is a decision-support prototype, **not a medical device**.

## Contents

1. [What it is](#what-it-is)
2. [How it works](#how-it-works)
3. [Real data and demo mode](#real-data-and-demo-mode)
4. [Install and run](#install-and-run)
5. [Related repository: smart-monitor](#related-repository-smart-monitor)
6. [Results](#results-simulation-not-clinical-performance)
7. [Repository layout](#repository-layout)
8. [Declared limits](#declared-limits)
9. [Sources, AI use and license](#official-challenge-resources)

## What it is

On a mission to Mars a message to the flight surgeon can take up to 22 minutes each way, so the doctor's answer can take 44, and evacuation is not possible. The crew has to detect, interpret and act on their own health.

VIGÍA ("lookout" in Spanish) turns a 90-second daily check-in into a clear status for each body system, with the reason and the next step, on board and offline.

**What makes it different:** it compares you with yourself, not with an average patient. It catches slow changes that a fixed threshold never sees (99.8 % against 0 % in our simulation) and uses cabin and space-weather measurements from NASA and NOAA to explain them.

### Who uses it

The first screen asks who you are. Each role has its own dashboard and its own address.

| Role | Address | What they see and do |
| --- | --- | --- |
| Astronaut | `/astronauta` | Their own body, the daily check-in, trends, alerts and reports. Private data stays on the device. |
| Crew Medical Officer | `/oficial` | The crew at a glance: watches, escalated red alerts with the minimum data, and each crew member's history. |
| Flight Surgeon | `/medico` | From the ground: the reports that arrive after the delay, and the replies. |

Every screen is available in English and Spanish. Use the language button in the header or add `?lang=en` or `?lang=es` to the address; the choice is remembered.

## How it works

### The three steps the challenge asks for

1. **Gather.** A guided daily check-in in under 90 seconds: heart rate, blood pressure, SpO2, temperature, sleep, mood, symptoms and, weekly, glucose. Each indicator has a fact sheet with how to measure it in flight and why it matters. A Galaxy Watch4 can pre-fill resting heart rate and SpO2.
2. **Evaluate.** A three-layer engine compares every reading with clinical bands, with the astronaut's own baseline and with slow drifts, and adds the measured environment as context.
3. **Act.** A clickable 3D body shows green, amber or red per system with the reason and the next step. Only a red safety alert reaches the crew medical officer. Reports travel to Earth through a queue with the communication delay.

### The engine

The engine ([packages/engine](packages/engine/MODULE.md)) asks three questions about each check-in, from the most urgent to the most subtle.

| Layer | Question | Method |
| --- | --- | --- |
| A, clinical safety | Is any value in the danger zone? | NEWS2 per-parameter bands (Royal College of Physicians, 2017) on heart rate, blood pressure, SpO2 and temperature, with our own aggregation cut-offs, more conservative than the RCP triggers: red on an extreme band (3 points in one parameter) or a total of 5 or more, amber on 3 or 4. |
| B, personal deviation | Is it unusual for you? | Modified z-score (median and MAD) against the astronaut's own baseline, two days in a row (weekly glucose: two readings in a row). |
| C, slow drift | Are you changing little by little? | One-sided CUSUM on resting heart rate, sleep and mood, from day 21. |
| Context | Does the environment explain it? | A headache with cabin CO2 above 3 mmHg becomes one environment alert for the crew, not a medical alert. A solar particle event switches on storm mode. |

The baseline moves from pre-flight to in-flight: days 1 to 14 are adaptation (informative only), 15 to 20 a blend, and from day 21 an in-flight window with a 3-day lag that leaves out days with alerts. A change of measuring instrument resets the window and pauses layers B and C for 8 days.

CO2 in ppm is converted to partial pressure with the cabin pressure of the mission profile. The data contracts and the engine carry five profiles (ISS, transit, Gateway-like, lunar and Mars surface); the app runs on the transit profile.

The engine exists twice: a Python reference in [pipelines/reanclaje/simulacion.py](pipelines/reanclaje/simulacion.py) and the TypeScript port the app runs. A parity test replays the same cases through both and requires the same alerts.

### Privacy and escalation

- Green and amber never leave the device. After three days in amber the app recommends sharing.
- A red layer-A alert is escalated automatically to the crew medical officer with the minimum data: indicator, value, time and band. The astronaut sees exactly what was sent and can add context once.
- Environment alerts are shared with the whole crew and carry no personal data.
- Every access to another crew member's data is written to an append-only audit table.

### Offline

A hand-written service worker caches the app shell, the engine and the 3D model. Check-ins and escalations queue locally and sync when the link returns. Only the first opening on a device needs a link.

### Architecture and data flow

```
 NASA and NOAA public APIs                      Galaxy Watch4 (optional)
 GOES · DONKI · RadLab · EDA                            │ WebSocket /watch
            │                                           ▼
            ▼                                 smart-monitor server :8765
 pipelines/datalake                           (separate repository)
 raw -> curated, never overwritten                      │ WebSocket /live
            │                                           │
            ▼                                           │
 pipelines/reanclaje                                    │
 re-anchors real dates to mission days,                 │
 publishes the gold zone with SHA-256                   │
            │                                           │
            ▼                                           ▼
 apps/api  (FastAPI + SQLite, port 8000) ◄──────────────┘
 serves verified environment, stores the crew record,
 escalations, delay queue and audit
            │  same-origin proxy /vigia-api
            ▼
 apps/web  (Next.js PWA, port 3000)
 runs packages/engine in the browser, works offline
```

`apps` and `pipelines` never import each other: they exchange data that follows the JSON Schema contracts in [packages/schemas](packages/schemas/MODULE.md). The API verifies the SHA-256 of every gold file before serving it and fails closed if it does not match.

## Real data and demo mode

| Mode | Crew physiology | Environment |
| --- | --- | --- |
| **Real** (default) | Only what the crew member enters or the watch measures. Nothing is simulated. | Measurements: GOES proton flux (NOAA SWPC) and DONKI solar particle events (NASA CCMC) on their real dates; RadLab dose (ALTEA-Survey, ISS) and EDA cabin CO2, temperature and humidity (Rodent Research-1, ISS) re-anchored to the mission timeline, each labeled with its source and real date. An unavailable source shows "no data". |
| **Demo** (`?modo=demo`) | A simulated crew on a 259-day Earth–Mars transit (Hohmann transfer departing 15 Sep 2011, today = day 135) with three injected anomalies: CO2 spike with headache (day 60), slow drift (days 100–109) and a 200 pfu storm (days 131–132). Labeled "Simulated". | Real DONKI solar particle events (NASA CCMC) on their true 2011–2012 dates, including the storm of 23 Jan 2012. Trajectory, communication delay (3 to 13 min on this transfer), transit dose (background of about 1.8 mSv/day, the figure published from MSL RAD), CO2 and proton flux belong to the scenario and are labeled "Simulated". |

Every environmental value shows whether it is **Real** or **Simulated**, its source and its real date. Series from different years are placed on one mission timeline by an explicit scenario; the app never presents that coincidence as an observed fact. Demo mode shows a banner on every dashboard screen and keeps a separate local store that is never uploaded or escalated.

## Install and run

### Requirements

| Tool | Version | Used by |
| --- | --- | --- |
| Git | 2.30 or later | cloning and hooks |
| Python | 3.10 or later (CI uses 3.12) | `pipelines/`, `apps/api`, `tools/` |
| Node.js | 22.18 or later | `apps/web` and the TypeScript tests |

On Windows, if `python` opens the Microsoft Store, install Python from python.org and use `py` wherever this guide says `python`.

### Quick start: the demo in five minutes

The demo crew and its Mars transit are committed to the repository, so the demo runs without downloading any data.

```sh
git clone https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions.git vigia
cd vigia

# 1. On-board API (terminal 1)
cd apps/api
pip install -r requirements.txt
python -m almacen sembrar                    # creates the SQLite database and the demo crew
python -m uvicorn main:app --port 8000

# 2. Web app (terminal 2)
cd apps/web
corepack enable                              # provides pnpm, the declared package manager
pnpm install
pnpm build && pnpm start                     # http://localhost:3000
```

Open http://localhost:3000/?modo=demo&lang=en. `npm install && npm run build && npm start` also works if you prefer npm. For development with hot reload use `pnpm dev` instead of the last line.

Without the next step the demo still works, but the Environment screen has no real solar particle events and real mode shows "no data" for the environment.

### Real environmental data

The data lake uses only the Python standard library. Data never goes to git, so each clone downloads its own.

```sh
cp .env.example .env                         # optional: set NASA_API_KEY (free at https://api.nasa.gov)
set -a; . ./.env; set +a                     # the data lake CLI reads variables from the shell

cd pipelines/datalake
python index.py ingest goes
python index.py ingest donki
# SEP events of the demo transit (15 Sep 2011 - 1 Jun 2012); DONKI accepts at most 60 days per request
python index.py ingest donki startDate=2011-09-15 endDate=2011-11-13
python index.py ingest donki startDate=2011-11-14 endDate=2012-01-12
python index.py ingest donki startDate=2012-01-13 endDate=2012-03-12
python index.py ingest donki startDate=2012-03-13 endDate=2012-05-11
python index.py ingest donki startDate=2012-05-12 endDate=2012-06-01
python index.py ingest eda mision=RR-1 start=2014-09-21T00:00:00Z end=2014-09-26T00:00:00Z
python index.py ingest radlab instrument_id=ALTEA-Survey "timestamp>=2011-11-12T00:00" "timestamp<2011-11-17T00:00" absorbed_dose_rate dose_equivalent_rate

cd ../reanclaje
python index.py panel escenarios/mision-real.json     # environment of the real mode
python index.py panel escenarios/mision-vigia.json    # environment of the demo mode
python index.py simular                               # reference case and KPIs
```

Restart the API afterwards: on start it prints which panels and scenarios it found. GOES publishes only the last 24 hours, so re-run `ingest goes` and `panel escenarios/mision-real.json` to move real mode forward. A window with no data is skipped with a warning and listed in the panel's `faltan` field; nothing is invented.

### Configuration

All variables are optional and live in `.env` at the repository root (template in [.env.example](.env.example); never commit it). The API reads `.env` when it starts.

| Variable | Default | Meaning |
| --- | --- | --- |
| `NASA_API_KEY` | `DEMO_KEY` | Key for the api.nasa.gov mirror of DONKI. |
| `DATALAKE_DIR` | `pipelines/datalake/data` | Folder of the data lake (raw, curated, gold). |
| `VIGIA_DB` | `apps/api/data/vigia.db` | SQLite file with the crew record. |
| `VIGIA_API_INTERNA` | `http://127.0.0.1:8000` | Address of the API as seen by the web server. Read at build time. |
| `NEXT_PUBLIC_VIGIA_API_URL` | empty | Direct API address for the browser; skips the same-origin proxy. |
| `SMART_URL` | `ws://127.0.0.1:8765/live` | Live feed of the smart-monitor server. |
| `SMART_DESACTIVADO` | empty | Set to `1` to turn the watch bridge off. |
| `SMART_TRIPULANTES` | empty | Watch name to crew member id, for example `"Ana=1,Luis=2"`. |
| `SMART_IP_LAN` | detected | Address of this machine suggested to the watch when it has several networks. |

Useful address parameters: `?modo=demo` or `?modo=real`, and `?lang=en` or `?lang=es`. Both are remembered.

### Tests

```sh
python -m unittest discover -s pipelines/datalake     # repeat for each Python module
python -m unittest discover -s apps/api
node --test packages/engine/*.test.ts apps/web/lib/*.test.ts
ruff check .
python tools/contextgen/contextgen.py --check
```

324 tests: 236 in Python (data lake, re-anchoring and simulator, schemas, translations, API, tools) and 88 in Node (engine, parity with the Python reference, app logic). CI runs them on every pull request together with the type check and the production build of the web app.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| Environment screen says there is no published panel | Run the steps in [Real environmental data](#real-environmental-data) and restart the API. |
| `DONKI ... HTTP Error 400` | The date range is longer than 60 days; split it as shown above. |
| The app shows a connection error on first load | The API is not running on port 8000, or `VIGIA_API_INTERNA` pointed elsewhere when the web app was built. |
| The device screen says the watch server is unreachable | Expected without smart-monitor. Set `SMART_DESACTIVADO=1` to hide it, or follow the next section. |
| `python` opens the Microsoft Store on Windows | Use `py`, or disable the app execution aliases in Windows settings. |

Developer setup, hooks and the team workflow (in Spanish): [docs/SETUP.md](docs/SETUP.md).

## Related repository: smart-monitor

VIGÍA has a companion repository, **[smoraleslo/smart-monitor](https://github.com/smoraleslo/smart-monitor)**, built by the same team for this project. It is the wearable side: an app that runs on a Samsung Galaxy Watch4 and the server that receives its readings. VIGÍA runs without it; with it, the watch fills in the resting heart rate and SpO2 of the daily check-in and shows the pulse live.

### What each repository owns

| | [smart-monitor](https://github.com/smoraleslo/smart-monitor) | VIGÍA (this repository) |
| --- | --- | --- |
| Runs on | The watch, and a Python server on port 8765 | The on-board API (port 8000) and the web app (port 3000) |
| Does | Reads the watch sensors once per second, validates wrist contact and movement, runs the guided daily check, computes resting heart rate, HRV and SpO2 | Stores the valid checks, evaluates them with the hybrid engine, shows status, alerts and next steps |
| Stores | Every 1 Hz reading, per person | Only valid checks: resting heart rate and SpO2 of the day |
| Documentation | Protocol and metric definitions in its `docs/` folder | [apps/api/AGENTES.md](apps/api/AGENTES.md), section "Reloj en vivo" |

### How they talk

```
Galaxy Watch4 ──WebSocket /watch──► smart-monitor server ──WebSocket /live──► VIGÍA API ──HTTP──► VIGÍA web app
              ◄── orders (measure SpO2, start check, tolerance) ◄──────────────┘
```

- The watch never talks to VIGÍA. It talks to the smart-monitor server, and VIGÍA's API ([apps/api/puente_reloj.py](apps/api/puente_reloj.py)) connects to that server's live feed like one more dashboard. The web app only talks to VIGÍA's API.
- VIGÍA keeps the latest state of each watch in memory and writes to its database only the valid checks of **linked** watches, labeled `galaxy_watch4:<device>` and `Real`. The 1 Hz stream never leaves memory.
- A watch is linked to a crew member by its name: through `SMART_TRIPULANTES`, through the **This is my watch** button on the Device screen, or because the name equals the crew member's alias. Factory names ("Tripulante XXXX") and a name used by two watches at once are never stored.
- VIGÍA can send three orders back through the server: measure SpO2 now, start the guided check, and change the movement tolerance. It can also download the per-second readings as CSV.
- The contract between both repositories is kept aligned by [tools/sincro-smart](tools/sincro-smart/MODULE.md): when a commit here changes the bridge, a git hook writes what must be reviewed into `PENDIENTES-VIGIA.md` in the local smart-monitor clone (set `SMART_DIR` in `.env`). It never commits there.

### Connect a watch

1. Clone [smart-monitor](https://github.com/smoraleslo/smart-monitor), install its watch app on the Galaxy Watch4 as its README explains, and start its server on the same machine as VIGÍA's API: `cd smart-monitor/server && SMART_HOST=0.0.0.0 python server.py` (port 8765).
2. On the watch app set **Server** to the address shown on VIGÍA's Device screen (`ws://<IP of the API machine>:8765/watch`) and give it a **crew member name** of your own, then start monitoring.
3. Open **Device** in VIGÍA and press **Connect**. The screen shows four steps (API, server, watch, wrist) and marks the one that fails with what to do. When the server sees your watch, press **This is my watch**.

Event and university networks often isolate devices from each other. [docs/SETUP.md](docs/SETUP.md) §8 explains how to run everything on one PC with its own hotspot for the watch.

## Results (simulation, not clinical performance)

500 simulated 30-day missions with anomalies and 500 control missions, seed 2026 ([pipelines/reanclaje/simulacion.py](pipelines/reanclaje/simulacion.py)); the TypeScript engine of the app reproduces the 30-day reference case and the 259-day Mars transit of the demo alert by alert. The generated outputs are committed as fixtures so the numbers can be checked without re-running the simulation: [kpi.json](packages/engine/fixtures/kpi.json), [barrido.json](packages/engine/fixtures/barrido.json) (parameter sweep), [caso-referencia.json](packages/engine/fixtures/caso-referencia.json) and [caso-viaje.json](packages/engine/fixtures/caso-viaje.json).

| KPI | Result |
| --- | --- |
| Slow drift detected (sleep −0.2 h/day, HR +1 bpm/day, mood −0.15/day) | 99.8 %, median 8 days after onset |
| Same drift at half intensity | 17.8 % |
| Fixed terrestrial threshold (HR ≥ 91 bpm) | never fired |
| CO2 + headache and solar storm rules | 100 % (deterministic) |
| False alarms per crew member per week | < 0.001 |

These numbers are optimistic: the simulated noise is Gaussian and the generator was written by the same team. They show that the engine sees a drift that a fixed threshold misses, not how it would perform on real crews.

## Repository layout

```
apps/web         on-board interface (Next.js PWA, English and Spanish)
apps/api         on-board API (FastAPI + SQLite): verified environment, crew record, escalation, delay queue, watch bridge
packages/engine  hybrid engine in pure TypeScript, with a parity test against the Python reference
packages/schemas data contracts, mission profiles and indicator fact sheets with sources
packages/i18n    translations (Spanish is the primary language, English is complete)
pipelines/       ingestion (GOES, DONKI, RadLab, EDA), re-anchoring to the mission timeline, simulator and Mars trajectory
tools/           team tooling (context generator, watch sync, reference validation, 3D model, presentations)
auditoria/       final reports, submission text, decks and the audit trail
documentacion/   technical report and validated references (Spanish)
```

Each module has a `MODULE.md` with its purpose and key points; the map of all of them is [docs/context/INDEX.md](docs/context/INDEX.md). Conventions and architecture (in Spanish): [AGENTS.md](AGENTS.md), [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md), [docs/CONVENCIONES.md](docs/CONVENCIONES.md).

## Declared limits

- Crew physiology in demo mode is simulated; no real astronaut data is used. Clinical bands come from NEWS2, a terrestrial standard, and the aggregation cut-offs are ours; both need review by a flight surgeon. Every threshold is a prototype rule with a cited source, not a clinically validated flight-medicine limit.
- The demo transit is a textbook Hohmann transfer with circular coplanar orbits, not real ephemerides. Its dose is a scenario model (background of about 1.8 mSv/day from Zeitlin et al. 2013, plus an assumed 3 mSv per storm day), not a measurement.
- The simulator's in-flight shifts (resting HR +3 bpm, systolic −4 mmHg, sleep −0.7 h) are a stress scenario for the detector, not a reproduction of the literature: Norsk et al. 2015 found 24-h heart rate unchanged and systolic pressure −8 mmHg on the ISS; Barger et al. 2014 report 6.1 h of sleep.
- Radiation in real mode is ambient dose from an area detector, not personal dose. GOES measures at geostationary orbit: it indicates severity and timing, not crew dose.
- The crew member is declared in a request header: there is no authentication yet. Also not implemented: body mass in layer C, the in-flight metrology correction of layer A, the PVT-B vigilance test, camera input and storage encryption.

## Official challenge resources

The five resources listed on the challenge page shaped the design: NASA HRP [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) (structure of the body figure and label of each alert), [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) (coverage table of the 17 risks in the report, §3.2), [Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) (what is measured in flight today), CSA [Monitoring radiation for astronaut health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) (dose module and its declared limit) and CSA [Why do we conduct science experiments in space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) (Earth impact). Datasets were located through [NASA OSDR](https://osdr.nasa.gov/) and the [NASA Life Sciences Portal](https://nlsp.nasa.gov/). Scientific references with DOIs: [documentacion/referencias-validadas.md](documentacion/referencias-validadas.md).

## Use of AI

We used AI coding assistants (Claude, by Anthropic, through Claude Code; OpenAI Codex as an independent reviewer) to research public NASA, CSA and NOAA sources, to draft and review documentation and to help write, review and test code. Problem framing, indicators, engine rules, data sources and design decisions are the team's; sources were checked by the team and are cited in the report. No AI-generated images, video or audio are used; no NASA logos or identifiers are used.

## License

Code under the [MIT License](LICENSE). The 3D anatomy comes from BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0; attribution in [apps/web/public/modelos/ATRIBUCION.md](apps/web/public/modelos/ATRIBUCION.md).

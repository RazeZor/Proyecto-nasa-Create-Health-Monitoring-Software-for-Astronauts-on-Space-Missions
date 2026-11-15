# VIGÍA

**Crew self-health monitor for long missions with communication delay.** NASA Space Apps Challenge 2026, challenge *Create Health Monitoring Software for Astronauts on Space Missions*.

Halfway to Mars a message to the flight surgeon takes up to 22 minutes each way and evacuation is not possible. VIGÍA ("lookout" in Spanish) lets each astronaut evaluate their own health and decide what to do next, on board, without waiting for Earth.

- **Live app:** https://vigia.smoraleslo.dev — demo scenario in English: https://vigia.smoraleslo.dev/?modo=demo&lang=en
- **Technical report (Spanish):** [documentacion/](documentacion/)
- VIGÍA is a decision-support prototype, **not a medical device**.

## What it does

1. **Daily check-in in under 90 seconds:** heart rate, blood pressure, SpO2, temperature, sleep, mood and symptoms, each with its unit and plain "how to measure in this mission profile" and "why it matters" instructions.
2. **Three-layer hybrid engine** ([packages/engine](packages/engine/MODULE.md)):
   - **A – clinical safety:** NEWS2 bands. Red on an extreme band or a total of 5+, amber on 3–4.
   - **B – personal deviation:** modified z-score (median and MAD) against the astronaut's own baseline, two days in a row.
   - **C – slow drift:** one-sided CUSUM from day 21.
   - The baseline moves from **pre-flight to in-flight** (days 1–14 adaptation, 15–20 blend, 21+ in-flight window with a 3-day lag).
3. **Measured environment inside the reasoning:** a headache with cabin CO2 above 3 mmHg becomes one environment alert for the crew, not a medical alert; a solar particle event switches on storm mode. CO2 in ppm is converted to partial pressure with the cabin pressure of the mission profile (ISS, transit, Gateway-like, lunar and Mars surface).
4. **Clickable body figure** with the status of each system, the reason and the next step.
5. **Privacy by default:** green and amber never leave the device. Only a red layer-A alert is escalated automatically to the crew medical officer, with the minimum data (indicator, value, time, band), and the astronaut sees exactly what was sent.
6. **Works offline:** the app shell, the engine, the check-in and the alerts run with the network off; check-ins and escalations queue locally and sync when the link returns. Reports to the ground travel through a delay queue.

## Real data and demo mode

| Mode | Crew physiology | Environment |
| --- | --- | --- |
| **Real** (default) | Only what the crew member enters or the watch measures. Nothing is simulated. | Measurements: GOES proton flux (NOAA SWPC) and DONKI solar particle events (NASA CCMC) on their real dates; RadLab dose (ALTEA-Survey, ISS) and EDA cabin CO2, temperature and humidity (Rodent Research-1, ISS) re-anchored to the mission timeline, each labeled with its source and real date. |
| **Demo** | A simulated 30-day crew member with three injected anomalies (slow drift, CO2 spike with headache, 200 pfu storm). Labeled "Simulated". | The same real measurements, plus the injected anomalies labeled "Simulated". |

Every environmental value shows whether it is **Real** or **Simulated**, its source and its real date. Series from different years are placed on one mission timeline by an explicit scenario; the app never presents that coincidence as an observed fact.

## Results (simulation, not clinical performance)

500 simulated missions with anomalies and 500 control missions, seed 2026 ([pipelines/reanclaje/simulacion.py](pipelines/reanclaje/simulacion.py)); the TypeScript engine of the app reproduces the reference case alert by alert.

| KPI | Result |
| --- | --- |
| Slow drift detected (sleep −0.2 h/day, HR +1 bpm/day, mood −0.15/day) | 99.8 %, median 8 days after onset |
| Same drift at half intensity | 17.8 % |
| Fixed terrestrial threshold (HR ≥ 91 bpm) | never fired |
| CO2 + headache and solar storm rules | 100 % (deterministic) |
| False alarms per crew member per week | < 0.001 |

These numbers are optimistic: the simulated noise is Gaussian and the generator was written by the same team. They show that the engine sees a drift that a fixed threshold misses, not how it would perform on real crews.

## Run it

Requirements: Python 3.10+ and Node.js 22.18+.

```sh
# 1. Real environmental data -> gold zone (standard library only)
cd pipelines/datalake
python index.py ingest goes
python index.py ingest donki
python index.py ingest donki startDate=2024-05-09 endDate=2024-05-15
python index.py ingest eda mision=RR-1 start=2014-09-21T00:00:00Z end=2014-09-26T00:00:00Z
python index.py ingest radlab instrument_id=ALTEA-Survey "timestamp>=2011-11-12T00:00" "timestamp<2011-11-17T00:00" absorbed_dose_rate dose_equivalent_rate
cd ../reanclaje
python index.py panel escenarios/mision-real.json     # environment of the real mode
python index.py panel escenarios/mision-vigia.json    # environment of the demo mode
python index.py simular                               # reference case and KPIs

# 2. On-board API
cd ../../apps/api
pip install -r requirements.txt
python -m almacen sembrar
uvicorn main:app --port 8000

# 3. Web app
cd ../web
npm install
npm run build && npm start                            # http://localhost:3000
```

Tests: `python -m unittest discover -s <module>` for each Python module and `node --test packages/engine/*.test.ts apps/web/lib/*.test.ts`.

## Repository

```
apps/web        on-board interface (Next.js PWA, Spanish and English)
apps/api        on-board API (FastAPI + SQLite): verified environment, crew record, escalation, delay queue
packages/engine hybrid engine in pure TypeScript, with a parity test against the Python reference
packages/schemas data contracts, mission profiles and indicator fact sheets with sources
packages/i18n   translations (Spanish is the primary language)
pipelines/      ingestion (GOES, DONKI, RadLab, EDA) and re-anchoring to the mission timeline; simulator
tools/          team tooling
```

Conventions and architecture (in Spanish): [AGENTS.md](AGENTS.md), [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md), [docs/CONVENCIONES.md](docs/CONVENCIONES.md), [docs/context/INDEX.md](docs/context/INDEX.md).

## Declared limits

- Crew physiology in demo mode is simulated; no real astronaut data is used. Clinical thresholds come from NEWS2, a terrestrial standard, and need review by a flight surgeon.
- Radiation is ambient dose from an area detector, not personal dose. GOES measures at geostationary orbit: it indicates severity and timing, not crew dose.
- Not yet implemented: glucose in layer B, the in-flight metrology correction of layer A, the PVT-B vigilance test, camera input, storage encryption and crew authentication.

## Use of AI

We used an AI assistant (Claude, by Anthropic) to research public NASA, CSA and NOAA sources, to draft documentation and to help write and review code. Sources were checked by the team and are cited in the report. No AI-generated images or videos are used.

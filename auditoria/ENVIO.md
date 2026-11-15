# Submission form text (English) — draft of iteration 1, 2026-11-15

Every field below is ready to paste into the NASA Space Apps project page. Items in `[brackets]` must be filled by the team before submitting. Rules checked against the 2026 *Project Submission Guide* (page dated 13 November 2026): all fields in English, demo of 30 s or 7 slides, public links without login, SI/AI declaration, NASA data described, every external resource listed in References.

## Project Name

VIGÍA

## High-Level Project Summary

On the International Space Station an astronaut with a health problem has a flight surgeon less than a second away. Halfway to Mars a message takes up to 22 minutes each way and evacuation is not possible. NASA calls this shift Earth-Independent Medical Operations: the crew must detect, interpret and act on their own.

VIGÍA (Spanish for "lookout") is an offline-first web app that helps each astronaut evaluate their own health and decide the next step on board. A guided daily check-in of under 90 seconds gathers heart rate, blood pressure, SpO2, temperature, sleep, mood, weekly glucose and symptoms, each with plain instructions on how to measure it in that mission profile and why it matters. A three-layer hybrid engine evaluates every reading: clinical safety bands (NEWS2 per-parameter bands with our own, more conservative cut-offs), deviation from the astronaut's own baseline (pre-flight during adaptation, in-flight afterwards) and cumulative sums that catch slow drifts a fixed threshold never sees.

Every reading is joined with the measured environment. We use real open data: radiation dose from ISS detectors (RadLab, NASA OSDR), cabin CO2, temperature and humidity (Environmental Data Application, NASA OSDR), solar energetic particle events (DONKI, NASA CCMC) and GOES proton flux (NOAA SWPC). A headache with cabin CO2 above 3 mmHg becomes an environment alert for the whole crew, not a medical alert for one person; a solar particle event switches on storm mode.

A clickable 3D anatomical body shows the status of each system with its reason and next step. Health data is private by default: only a red safety alert is escalated automatically to the crew medical officer, with the minimum data, and the astronaut sees exactly what was sent. Reports to the ground travel through a queue that respects the mission's communication delay. Everything runs on board without a link.

In real mode VIGÍA only shows what the crew member enters or the watch measures; in demo mode a simulated 30-day crew member with three injected anomalies is shown, labelled "Simulated" on every screen. VIGÍA is a decision-support prototype, not a medical device.

## Link to Project Demo

`[PUBLIC LINK — 7-slide deck in English or ≤30 s video with English subtitles; content prepared in auditoria/DEMO.md; test the link in a private window]`

## Link to Final Project

- Live app: https://vigia.smoraleslo.dev (demo scenario in English: https://vigia.smoraleslo.dev/?modo=demo&lang=en)
- Source code and documentation: https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions

## Detailed Project Description

**What it does.** VIGÍA is the on-board health companion of a long-duration crew. Each astronaut completes a daily check-in in under 90 seconds: resting heart rate, systolic blood pressure, SpO2, body temperature, hours of sleep, mood, a closed list of symptoms (headache, nausea, dizziness, vision, rash) and, weekly, glucose. Each indicator has a fact sheet with six fields taken from NASA Human Research Program material: what it is, how to measure it in flight for the active mission profile, why it is needed, which spaceflight hazard alters it, when to warn and what prevention exists. A Galaxy Watch4 can pre-fill the resting heart rate and SpO2 of the day.

**How it decides.** A hybrid engine, written once in Python (reference) and once in TypeScript (the app), with a parity test between them, asks three questions about every check-in:

1. *Layer A — clinical safety.* NEWS2 per-parameter bands (Royal College of Physicians, 2017) on heart rate, blood pressure, SpO2 and temperature, with our own aggregation cut-offs, more conservative than the RCP triggers: red when a single parameter scores 3 or the total is 5 or more; amber at 3–4. Every red is escalated automatically to the crew medical officer. These are prototype rules with cited sources, not clinically validated flight limits.
2. *Layer B — personal deviation.* A modified z-score (median and MAD) of each indicator against the astronaut's own baseline, two days in a row. The baseline moves from pre-flight to in-flight: days 1–14 adaptation (informative only), 15–20 blend, from day 21 an in-flight window with a 3-day lag that excludes days with alerts.
3. *Layer C — slow drift.* A one-sided CUSUM on resting heart rate (upwards), sleep and mood (downwards) from day 21, reset after each alert.

Context rules sit on top: cabin CO2 above 3 mmHg with reported headache becomes a crew-level environment alert with no personal data; a GOES proton flux of 10 pfu or more, or a DONKI SEP event, switches storm mode on for the day. CO2 arrives in ppm and is converted to partial pressure with the cabin pressure of the mission profile (ISS and transit 760 mmHg, docked 527 mmHg, lunar and Mars surface 424 mmHg), so the same reading can be an alert in one profile and not in another. A change of measuring instrument resets the baseline window and pauses layers B and C for 8 days.

**How the output looks.** The home screen is a 3D anatomical body (BodyParts3D, CC BY 4.0) whose organs light up by system with the status, the reason and the next step; it beats at the measured heart rate. Trends show each indicator against its personal band. The Environment screen shows radiation dose, proton flux, SEP events and cabin CO2, temperature and humidity, each labelled Real or Simulated with its source and real date. Alerts show who can see them (astronaut only, crew, medical officer) and what exactly left the device. Reports show the delay queue to the ground and the flight surgeon's replies.

**Privacy and escalation.** Green and amber never leave the device. Only a red layer-A alert goes automatically to the crew medical officer with the minimum data (indicator, value, time, band); the astronaut can add context once; after three days in amber the app recommends sharing. Every access by another role is written to an append-only audit table.

**Real mode and demo mode.** Real mode (default) shows only what the crew member enters or the watch measures plus the measured environment; nothing is simulated and an unavailable source shows "no data". Demo mode (`?modo=demo` or the Data selector) shows a simulated 30-day crew member with three injected anomalies — a slow drift in sleep, heart rate and mood, a CO2 spike with headache and a 200 pfu storm — with a "Demo" banner on every screen and a separate local store that is never uploaded or escalated.

**Validation.** 500 simulated missions with anomalies and 500 control missions (seed 2026): the slow drift was detected in 99.8 % of missions, 8 days after onset (median); the same drift at half intensity in 17.8 %; a fixed terrestrial threshold (HR ≥ 91 bpm) never fired; CO2 and storm rules fired in 100 % of cases; false alarms per crew member per week were below 0.001. These are simulation results with Gaussian noise written by the same team: they show that the engine sees a drift a fixed threshold misses, not clinical performance. All thresholds are prototype rules with cited sources, not clinically validated flight-medicine limits.

**Offline.** A hand-written service worker caches the app shell, the engine and the 3D model; check-ins and escalations queue locally and sync when the link returns. Only the first opening on a device needs a link.

**Tools and languages.** Next.js 16, React 19, TypeScript and Tailwind CSS 4 for the PWA; three.js for the 3D body; FastAPI and SQLite for the on-board API; Python 3 (standard library only) for the data lake and the ETL that re-anchors real measurements to the mission timeline; JSON Schema contracts shared between pipelines and apps; node:test and unittest (248 tests). Interface in Spanish and English.

**What we hope to achieve.** To move health monitoring from "send data to Earth" to "decide on board", with a method a flight surgeon can audit: every alert states its layer, its threshold, its source and what left the device. The same architecture serves analog missions, Antarctic stations and remote communities on Earth.

**Declared limits.** No real astronaut physiology is used; demo physiology is simulated. Clinical bands come from NEWS2, a terrestrial standard, and need review by a flight surgeon. Radiation is ambient dose from an area detector, not personal dose; GOES measures at geostationary orbit and indicates severity and timing, not crew dose. Not yet implemented: body mass in layer C, in-flight metrology correction of layer A, the PVT-B vigilance test, camera input, storage encryption and crew authentication.

## Use of Super Intelligence (SI)

Yes. We used an AI coding assistant (Claude, by Anthropic, through Claude Code) and OpenAI Codex as tools to research public NASA, CSA and NOAA sources, to draft and review documentation and the submission text, and to help write, review and test code; this is acknowledged in the repository README and in this field. The problem framing, the choice of indicators and engine rules, the data sources and the design decisions were made by the team, and all cited sources were checked by the team. No SI-generated images, video or audio are used in the project or the demo; the 3D body is a processed open anatomical model (BodyParts3D), the icons and the logo were drawn by the team. No NASA logos, flags or mission identifiers are used or modified.

## NASA Data

Used as a core component of the solution, not as decoration. Each dataset enters the data lake through its public API, is re-anchored to the mission timeline by an explicit scenario and is shown in the app with its source and real date.

- **NASA OSDR — RadLab** (radiation data portal and API, https://visualization.osdr.nasa.gov/radlab/): absorbed and equivalent dose rates of the ALTEA-Survey detector on the ISS (12–17 November 2011). Feeds the ambient dose on the Environment screen and the dose context of each alert.
- **NASA OSDR — Environmental Data Application (EDA)** (https://visualization.osdr.nasa.gov/eda/): cabin CO2 (ppm), temperature and relative humidity of the ISS during Rodent Research-1 (21–26 September 2014), 5-minute telemetry. The CO2 reading enters the engine's "headache + CO2" rule after conversion to partial pressure with the cabin pressure of the mission profile.
- **NASA CCMC — DONKI** (Space Weather Database Of Notifications, Knowledge, Information, https://ccmc.gsfc.nasa.gov/tools/DONKI/, via api.nasa.gov): solar energetic particle (SEP) events of the May 2024 storm period. A SEP event switches storm mode on for the whole crew in the app.
- **NASA Human Research Program**: *5 Hazards of Human Spaceflight* (https://www.nasa.gov/hrp/hazards/), *Risks of Human Spaceflight* (https://www.nasa.gov/hrp/risks/) and *Ongoing HRP Research in Space* (https://www.nasa.gov/hrp/ongoing-hrp-research/): structure of the body figure, content and sources of the indicator fact sheets, coverage table of the 17 HRP risks in the technical report.
- **NASA OSDR — Inspiration4 (OSD-569, OSD-575)** (https://osdr.nasa.gov/): the only public human clinical reference used, cited for the within-person variability of blood chemistry; not integrated as live data.
- **NASA OSDR portal and FAQ** (https://osdr.nasa.gov/, https://science.nasa.gov/reference/osdr-faq/) and the **NASA Life Sciences Portal** (https://nlsp.nasa.gov/) were used to search for human spaceflight datasets and to confirm that no public continuous astronaut telemetry exists, which is why crew physiology is entered by the user or simulated and labelled.

## Space Agency Partner Data and Other References

**Space agency partner resources**

- CSA, *Monitoring radiation for astronaut health* (2026): https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp — justifies the dose module and its declared limit (neutron component not separated).
- CSA, *Why do we conduct science experiments in space?*: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp — Earth impact framing.
- CSA, Bio-Monitor (ECG, blood pressure, respiration, skin temperature, SpO2): signal schema of the data model.

**Other data**

- NOAA SWPC, GOES integral proton flux (≥10, ≥50, ≥100 MeV), 5-minute averages: https://services.swpc.noaa.gov/json/goes/primary/integral-protons-plot-6-hour.json — storm severity; S1 threshold of 10 pfu from the NOAA Space Weather Scales (https://www.swpc.noaa.gov/noaa-scales-explanation).

**Scientific sources of the engine rules** (full list with DOIs in `documentacion/referencias-validadas.md` and the report's *Fuentes* section)

- Royal College of Physicians, *National Early Warning Score (NEWS) 2* (2017): clinical bands of layer A.
- Law J. et al., *Relationship between carbon dioxide levels and reported headaches on the International Space Station*, J Occup Environ Med 2014: 3 mmHg CO2 rule.
- Baevsky R.M. et al., *Autonomic cardiovascular and respiratory control during prolonged spaceflights*, J Appl Physiol 2007, and Norsk P. et al., *Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long duration spaceflight*, J Physiol 2015: in-flight shifts of heart rate and blood pressure used in the simulator.
- Barger L.K. et al., *Prevalence of sleep deficiency and use of hypnotic drugs in astronauts*, Lancet Neurology 2014: sleep baseline.
- NASA, *Earth-Independent Medical Operations* and *Risk of Adverse Health Outcomes and Decrements in Performance Due to In-flight Medical Conditions*: problem framing.
- Challenge mentor guidance received on Space Apps Connect (hybrid real + labelled synthetic data, individual baseline, three transparent alert levels).

**Software, fonts and models (open source)**

- Next.js (MIT), React (MIT), TypeScript (Apache-2.0), Tailwind CSS (MIT), three.js (MIT), lucide-react (ISC), Base UI (MIT), FastAPI (MIT), Uvicorn (BSD-3), SQLite (public domain), Python standard library.
- Fonts: Space Grotesk and IBM Plex Mono (SIL Open Font License), bundled with Fontsource.
- 3D anatomy: BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0 (https://lifesciencedb.jp/bp3d/); processing scripts in `tools/modelo-anatomico`, attribution in `apps/web/public/modelos/ATRIBUCION.md` and visible in the app.
- Wearable bridge: smart-monitor (team's own Galaxy Watch4 server, https://github.com/smoraleslo/smart-monitor).
- Logo, icons and illustrations: drawn by the team.

No copyrighted material is used without permission. No personal data: the demo crew member is simulated; the real mode stores only what the user enters on their own device and on-board API. No likeness of persons under 18.

## Team information for the demo (required on the slides or video)

- Team name: `[TEAM NAME as registered on spaceappschallenge.org]`
- Members: `[names exactly as on the Members tab]`
- Local event: `[event name]`
- Challenge: Create Health Monitoring Software for Astronauts on Space Missions

## Pre-submission checklist (gates E1–E10 of RUBRICA.md)

- [ ] All members registered in the same Local Event and visible on the Members tab (max 6).
- [ ] Demo link public, ≤ 7 slides or ≤ 30 s, in English, tested in a private window.
- [ ] Final project links public (repository and live site), tested in a private window.
- [ ] Live site updated to `main` (redeploy) and in English for `?lang=en`.
- [ ] Both checkboxes ticked (Terms; original work) and *Submit for Judging* pressed before 23:59 local time.
- [ ] Optional: FortiGuard web filter classification requested for vigia.smoraleslo.dev (https://www.fortiguard.com/faq/wfratingsubmit).

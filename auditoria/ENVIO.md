# Submission form text (English) — draft of iteration 1, 2026-11-15

Every field below is ready to paste into the NASA Space Apps project page. Items in `[brackets]` must be filled by the team before submitting. Rules checked against the 2026 *Project Submission Guide* (page dated 13 November 2026): all fields in English, demo of 30 s or 7 slides, public links without login, SI/AI declaration, NASA data described, every external resource listed in References.

## Project Name

VIGÍA

## High-Level Project Summary

*(≈150 words, readable in 60 seconds)*

On a mission to Mars a message to the flight surgeon can take up to 22 minutes each way and evacuation is impossible: the crew must detect, interpret and act on their own health. **VIGÍA** (Spanish for "lookout") is an offline-first web app that tells each astronaut how they are and what to do next, without waiting for Earth. It compares each astronaut with their own baseline, not with an average patient, so it catches slow changes that a fixed threshold never sees.

**Gather:** a guided daily check-in under 90 seconds (heart rate, blood pressure, SpO2, temperature, sleep, mood, symptoms, weekly glucose), each indicator with how-to-measure and why-it-matters instructions. **Evaluate:** a three-layer engine compares every reading with clinical safety bands, with the astronaut's own baseline and with slow drifts, and joins it with real NASA and NOAA environment data (solar particle events from NASA DONKI on their true dates, ISS radiation dose and cabin CO2 from NASA OSDR, GOES proton flux). **Act:** a clickable 3D body shows green, amber or red per system with the reason and the next step; only a red safety alert reaches the crew medical officer, with the minimum data; reports travel to Earth under the real communication delay.

Real mode shows only what the crew enters or the watch measures; demo mode shows a labelled simulated crew on a 259-day Earth–Mars transit. Decision-support prototype, not a medical device.

## Link to Project Demo

`[PUBLIC LINK — 7-slide deck in English or ≤30 s video with English subtitles; content prepared in auditoria/DEMO.md; test the link in a private window]`

## Link to Final Project

- Live app: https://vigia.smoraleslo.dev (demo scenario in English: https://vigia.smoraleslo.dev/?modo=demo&lang=en)
- Source code and documentation: https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions

## Detailed Project Description

**What it does.** VIGÍA is the on-board health companion of a long-duration crew. Each astronaut completes a daily check-in in under 90 seconds: resting heart rate, systolic blood pressure, SpO2, body temperature, hours of sleep, mood, a closed list of symptoms (headache, nausea, dizziness, vision, rash) and, weekly, glucose. Each indicator has a fact sheet with six fields taken from NASA Human Research Program material: what it is, how to measure it in flight for the mission profile, why it is needed, which spaceflight hazard alters it, when to warn and what prevention exists. A Galaxy Watch4 can pre-fill the resting heart rate and SpO2 of the day.

**How it decides.** A hybrid engine, written once in Python (reference) and once in TypeScript (the app), with a parity test between them, asks three questions about every check-in:

1. *Layer A — clinical safety.* NEWS2 per-parameter bands (Royal College of Physicians, 2017) on heart rate, blood pressure, SpO2 and temperature, with our own aggregation cut-offs, more conservative than the RCP triggers: red when a single parameter scores 3 or the total is 5 or more; amber at 3–4. Every red is escalated automatically to the crew medical officer. These are prototype rules with cited sources, not clinically validated flight limits.
2. *Layer B — personal deviation.* A modified z-score (median and MAD) of each indicator against the astronaut's own baseline, two days in a row. The baseline moves from pre-flight to in-flight: days 1–14 adaptation (informative only), 15–20 blend, from day 21 an in-flight window with a 3-day lag that excludes days with alerts.
3. *Layer C — slow drift.* A one-sided CUSUM on resting heart rate (upwards), sleep and mood (downwards) from day 21, reset after each alert.

Context rules sit on top: cabin CO2 above 3 mmHg with reported headache becomes a crew-level environment alert with no personal data; a GOES proton flux of 10 pfu or more, or a DONKI SEP event, switches storm mode on for the day. CO2 arrives in ppm and is converted to partial pressure with the cabin pressure of the mission profile (ISS and transit 760 mmHg, docked 527 mmHg, lunar and Mars surface 424 mmHg), so the same reading can be an alert in one profile and not in another; the app itself runs on the transit profile. A change of measuring instrument resets the baseline window and pauses layers B and C for 8 days.

**How the output looks.** The home screen is a 3D anatomical body (BodyParts3D, CC BY 4.0) whose organs light up by system with the status, the reason and the next step; it beats at the measured heart rate. Trends show each indicator against its personal band. The Environment screen shows radiation dose, proton flux, SEP events and cabin CO2, temperature and humidity, each labelled Real or Simulated with its source and real date. Alerts show who can see them (astronaut only, crew, medical officer) and what exactly left the device. Reports show the delay queue to the ground and the flight surgeon's replies.

**Privacy and escalation.** Green and amber never leave the device. Only a red layer-A alert goes automatically to the crew medical officer with the minimum data (indicator, value, time, band); the astronaut can add context once; after three days in amber the app recommends sharing. Every access by another role is written to an append-only audit table.

**Real mode and demo mode.** Real mode (default) shows only what the crew member enters or the watch measures plus the measured environment; nothing is simulated and an unavailable source shows "no data". Demo mode (`?modo=demo` or the Data selector) shows a simulated crew on a 259-day Earth–Mars transit (a Hohmann transfer departing 15 September 2011; today is mission day 135). Every mission day has a position, a communication delay (3 to 13 minutes on this transfer) and an accumulated dose. Three anomalies are injected — a CO2 spike with headache (day 60), a slow drift in sleep, heart rate and mood (days 100–109) and a 200 pfu storm (days 131–132) — and the real DONKI solar particle events of 2011–2012 fall on their true dates, including the storm of 23 January 2012. The crew medical officer and the flight surgeon can open each crew member's history day by day. A "Demo" banner is on every screen and the demo uses a separate local store that is never uploaded or escalated.

**Validation.** 500 simulated 30-day missions with anomalies and 500 control missions (seed 2026): the slow drift was detected in 99.8 % of missions, 8 days after onset (median); the same drift at half intensity in 17.8 %; a fixed terrestrial threshold (HR ≥ 91 bpm) never fired; CO2 and storm rules fired in 100 % of cases; false alarms per crew member per week were below 0.001. These are simulation results with Gaussian noise written by the same team: they show that the engine sees a drift a fixed threshold misses, not clinical performance. All thresholds are prototype rules with cited sources, not clinically validated flight-medicine limits.

**Offline.** A hand-written service worker caches the app shell, the engine and the 3D model; check-ins and escalations queue locally and sync when the link returns. Only the first opening on a device needs a link.

**Tools and languages.** Next.js 16, React 19, TypeScript and Tailwind CSS 4 for the PWA; three.js for the 3D body; FastAPI and SQLite for the on-board API; Python 3 (standard library only) for the data lake and the ETL that re-anchors real measurements to the mission timeline; JSON Schema contracts shared between pipelines and apps; node:test and unittest (324 tests: 236 Python, 88 Node). Interface in Spanish and English.

**What we hope to achieve.** To move health monitoring from "send data to Earth" to "decide on board", with a method a flight surgeon can audit: every alert states its layer, its threshold, its source and what left the device. The same architecture serves analog missions, Antarctic stations and remote communities on Earth.

**Declared limits.** No real astronaut physiology is used; demo physiology is simulated. Clinical bands come from NEWS2, a terrestrial standard, and need review by a flight surgeon. Radiation in real mode is ambient dose from an area detector, not personal dose; the transit dose of the demo is a scenario model (background of about 1.8 mSv/day, the figure published from MSL RAD, plus storms), not a measurement; GOES measures at geostationary orbit and indicates severity and timing, not crew dose. Not yet implemented: body mass in layer C, in-flight metrology correction of layer A, the PVT-B vigilance test, camera input, storage encryption and crew authentication.

## Use of Super Intelligence (SI)

Yes. We used an AI coding assistant (Claude, by Anthropic, through Claude Code) and OpenAI Codex as tools to research public NASA, CSA and NOAA sources, to draft and review documentation and the submission text, and to help write, review and test code; this is acknowledged in the repository README and in this field. The problem framing, the choice of indicators and engine rules, the data sources and the design decisions were made by the team, and all cited sources were checked by the team. No SI-generated images, video or audio are used in the project or the demo; the 3D body is a processed open anatomical model (BodyParts3D), the icons and the logo were drawn by the team. No NASA logos, flags or mission identifiers are used or modified.

## NASA Data

Used as a core component of the solution, not as decoration. Each dataset enters the data lake through its public API, is re-anchored to the mission timeline by an explicit scenario and is shown in the app with its source and real date.

- **NASA OSDR — RadLab** (radiation data portal and API, https://visualization.osdr.nasa.gov/radlab/): absorbed and equivalent dose rates of the ALTEA-Survey detector on the ISS (12–17 November 2011). Feeds the ambient dose on the Environment screen in real mode.
- **NASA OSDR — Environmental Data Application (EDA)** (https://visualization.osdr.nasa.gov/eda/): cabin CO2 (ppm), temperature and relative humidity of the ISS during Rodent Research-1 (21–26 September 2014), 5-minute telemetry. In real mode the CO2 reading enters the engine's "headache + CO2" rule after conversion to partial pressure with the cabin pressure of the mission profile.
- **NASA CCMC — DONKI** (Space Weather Database Of Notifications, Knowledge, Information, https://ccmc.gsfc.nasa.gov/tools/DONKI/): solar energetic particle (SEP) events. The demo transit uses the 31 real events recorded between 15 September 2011 and 1 June 2012 on their true dates (the storm of 23 January 2012 is mission day 131); real mode uses the events of the current dates. A SEP event switches storm mode on for the whole crew in the app.
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
- Zeitlin C. et al., *Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory*, Science 2013 (doi:10.1126/science.1235989): background transit dose of the demo scenario (about 1.8 mSv/day).
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

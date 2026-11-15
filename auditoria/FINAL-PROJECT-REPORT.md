# VIGÍA — Final Project Report

**Team:** `[TEAM NAME]`
**Challenge:** *Create Health Monitoring Software for Astronauts on Space Missions* — NASA Space Apps Challenge 2026 (Intermediate; Human Exploration, Software, Space Exploration; partner agency: Canadian Space Agency)
**Live app:** https://vigia.smoraleslo.dev — demo scenario in English: https://vigia.smoraleslo.dev/?modo=demo&lang=en
**Repository:** https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions
**Technical report (Spanish, full detail):** `documentacion/VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md`
**Date:** 15 November 2026

**Abstract.** Halfway to Mars a message to the flight surgeon takes up to 22 minutes each way and evacuation is not possible, so the crew must detect, interpret and act on their own health. VIGÍA (Spanish for "lookout") is an offline-first web application that lets each astronaut do exactly that on board. A guided daily check-in of under 90 seconds collects resting heart rate, blood pressure, SpO2, temperature, sleep, mood and symptoms (glucose and body mass weekly). A three-layer hybrid engine compares every reading with clinical safety bands (NEWS2 per-parameter bands with the team's own, more conservative aggregation cut-offs), with the astronaut's own in-flight baseline (median/MAD modified z-score) and with slow drifts (one-sided CUSUM), and joins the result with real NASA and NOAA environment data: ISS radiation dose (OSDR RadLab), cabin CO2, temperature and humidity (OSDR EDA), solar particle events (CCMC DONKI) and GOES proton flux (NOAA SWPC). A clickable 3D body shows green, amber or red per body system with the reason and the next step; only a red safety alert leaves the device, to the crew medical officer, with the minimum data; reports to Earth travel under the real communication delay of the mission profile. In 500 simulated missions the engine detected an injected slow drift in 99.8 % of cases (median 8 days after onset) while a fixed terrestrial threshold never fired; these are simulation results, not clinical performance. VIGÍA is a decision-support prototype, not a medical device.

---

## 1. Executive summary

**Problem.** NASA's *Earth-Independent Medical Operations* (EIMO) concept states that on Mars-class missions there is no evacuation, no sample return and no real-time ground support: medical decisions move from the ground to the crew. Today's on-orbit health software is built to send data to Earth for interpretation. The five hazards of human spaceflight (radiation, isolation and confinement, distance from Earth, altered gravity, hostile closed environment) interact, and the body in flight shifts away from terrestrial reference ranges, so a dashboard that applies Earth thresholds to isolated signals misses both the interaction and the drift.

**Solution.** VIGÍA closes the loop on board in three steps: **gather** (guided check-in with units, "how to measure in this mission profile" and "why it matters" for every indicator), **evaluate** (hybrid engine: clinical floor, personal deviation, slow drift, plus context rules that read the measured environment) and **act** (status per body system with explanation and next step, privacy-by-default escalation, delayed reports to the flight surgeon). Everything runs in the browser and the on-board API; the network only pre-loads environment data and synchronises reports.

**What is real and what is simulated.** The environment is real: GOES proton flux and DONKI SEP events on their real dates; RadLab dose (ALTEA-Survey, ISS, November 2011) and EDA cabin telemetry (Rodent Research-1, ISS, September 2014) re-anchored to the mission timeline, each value labelled with source and real date. Crew physiology is never public: in **real mode** (default) the app shows only what the crew member enters or the watch measures; in **demo mode** a simulated 30-day crew member with three injected anomalies is shown and labelled "Simulated" on every screen.

**Headline results (simulation, seed 2026, 500 anomaly missions + 500 control missions).**

| KPI | Result |
| --- | --- |
| Slow drift detected (sleep −0.2 h/day, HR +1 bpm/day, mood −0.15/day) | 99.8 %, median 8 days after onset |
| Same drift at half intensity | 17.8 %, median 9 days |
| Fixed terrestrial threshold (HR ≥ 91 bpm) | never fired |
| CO2 + headache rule; solar storm rule | 100 % (deterministic rules) |
| False alarms per crew member per week (control missions) | 0.0003 (days 1–14, layer A only); 0.000 (days 15–30) |
| Independent re-run with seed 2027 | 99.8 % detection, 8 days; 0 false alarms |

The TypeScript engine of the app reproduces the Python reference case alert by alert (parity test), so the figures also describe the engine the user runs.

**Limits in one paragraph.** No real astronaut physiology is used. Layer-A bands come from NEWS2, a terrestrial hospital standard, applied to 4 of its 7 parameters with the team's own aggregation cut-offs; every threshold is a cited prototype rule awaiting flight-surgeon review. Simulated noise is Gaussian and the generator was written by the same team, so the KPIs are optimistic. Radiation is ambient dose from an area detector, not personal dose; GOES measures at geostationary orbit and indicates severity and timing, not crew dose. Not implemented: body mass in layer C, in-flight metrology correction of layer A, the PVT-B vigilance test, camera input, storage encryption and crew authentication.

---

## 2. The challenge and how VIGÍA answers it

The official challenge asks for software that gathers health indicators and lets the astronaut evaluate their state and act. Its five listed resources are NASA HRP and CSA reference material, not datasets. Traceability of each objective and consideration:

| What the challenge asks | Type | How VIGÍA answers | Status in the prototype |
| --- | --- | --- | --- |
| Visual tool for the astronaut to evaluate their own health and get guidance on treatment and improvement | Objective | Status per body system on a clickable 3D body, with the reason and an action card ("what to do now") | Implemented |
| Data by any input (keyboard, clicks, camera images) representing an indicator with its unit | Objective | Daily check-in with visible units (mmHg, bpm, %, °C, h, mg/dL, kg); dial and slider input designed for a touch screen; Galaxy Watch4 pre-fills resting HR and SpO2 | Implemented without camera input (roadmap) |
| Use public resources to decide which indicators matter, which are measured in space, why the exam is needed, how hazards affect them, when to warn crew or flight surgeon, what prevention exists | Objective | A fact sheet per indicator with those six fields and a cited source for each; the "how to measure in flight" text changes with the mission profile | Implemented (10 fact sheets, Spanish and English) |
| Clear interface; suggested clickable human figure showing function and state of each part | Objective | 3D anatomical body (BodyParts3D, CC BY 4.0) coloured by system, beating at the measured heart rate; 2D SVG fallback without WebGL | Implemented |
| Information for different environments: spacecraft, station, rover, planetary base | Consideration | Five mission profiles (station, transit, docked transit/Gateway-like, lunar surface, Mars surface) that change cabin pressure, gravity, delay and measurement instructions | Implemented |
| Remind the astronaut to take measurements or complete routine actions | Consideration | Reminders of the daily check-in and weekly measurements | Implemented (fixed reminder content; demo content is labelled) |
| Gamification, indicator graphs over time, colour coding | Consideration | Trend charts with the personal band; green/amber/red everywhere; 90-second timer and progress bar in the check-in | Charts and colours implemented; streaks not implemented |
| Simple instructions and explanations of measurements, indicators and risks | Consideration | "How to measure" and "why it matters" on every indicator; a "Risk framework" section in About | Implemented |

The six example indicators named by the challenge (blood pressure, heart rate, blood glucose, body temperature, hours of sleep, mood) all enter the check-in. What VIGÍA adds beyond the statement: a three-layer hybrid engine, measured environment inside the reasoning, and operation under communication delay. Mentor guidance received on Space Apps Connect (hybrid real plus labelled synthetic data, an individual baseline, three transparent alert levels) shaped these choices.

---

## 3. Problem and evidence

**EIMO and the delay.** On the ISS the one-way delay is of the order of 0.25 s via TDRS relay and a return capsule is hours away. Toward Mars the one-way delay reaches about 22 minutes (NASA Ames, Parisi 2024; NASA ASCEND communication-delay study), more than 40 minutes round trip; evacuation and sample return are impossible. The EIMO Concept of Operations (NASA NTRS, 2024 and 2025 revision) therefore moves medical care and decision-making progressively to the crew. The Moon sits in between: 1.3 s of light time, with NASA expecting 5–12 s of operational delay on Artemis because of relay and processing.

**Five hazards, more than 30 risks.** NASA HRP groups the risks of human spaceflight into five hazards (RIDGE: Radiation, Isolation and confinement, Distance from Earth, Gravity fields, hostile closed Environment) and states that they feed back on one another. Patel et al. (2020) count more than 30 documented health risks linked to them. VIGÍA's body figure, alert labels and fact sheets use that taxonomy; the technical report (§3.2) maps the 17 HRP-listed risks to indicators and declares which are covered fully, partially or not at all (decompression sickness, EVA injury, host–microorganism interactions, teamwork and dynamic loads are out of scope).

**Physiology in flight is not terrestrial physiology.** Figures that fix the design, each from a primary source checked by the team:

| Finding | Source | Consequence for VIGÍA |
| --- | --- | --- |
| 24-h ambulatory brachial blood pressure falls (systolic −8 mmHg) through a 39 % drop in systemic vascular resistance; 24-h heart rate unchanged (n = 8 men, 3–6 months on the ISS) | Norsk et al., *J Physiol* 2015 | An in-flight baseline is mandatory; a "normal" terrestrial value is not normal in orbit. Cuff-less wrist blood pressure, calibrated on Earth, cannot be trusted in flight |
| Astronauts obtain about 6 h of sleep per night in flight (6.09 h on the ISS); in 24 astronauts on 6-month missions, less sleep was associated with slower response speed and more stress | Barger et al., *Lancet Neurol* 2014; Jones et al., *Sleep* 2022 | Sleep duration is a core indicator; only total duration is used (actigraphy estimates duration well and efficiency poorly) |
| Core temperature at rest rises about 1 °C over 2.5 months and exceeded 40 °C during exercise in some individuals | Stahn et al., *Sci Rep* 2017 | A terrestrial fever threshold gives false positives in flight; skin temperature from a watch does not replace core temperature |
| Plasma volume falls about 17 % in the first 24 h; space motion sickness occurs during the first 1–2 days | Williams et al., *CMAJ* 2009 | The first days are not a valid reference: layers B and C are informative only during a 14-day adaptation mode |
| Bone loss of 1 %/month (spine) and 1.5 %/month (hip) | Lang et al., *J Bone Miner Res* 2004 | Exercise compliance and weekly body mass are tracked; bone density itself cannot be measured in flight |
| Body mass loss measured as −4.4 % (BMMD) and −2.8 % (SLAMMD) in the same 25 crew members | Zwart et al., *Aviat Space Environ Med* 2014 | The measuring device is stored with the value; masses from different instruments are not compared silently |
| For each 1 mmHg increase in cabin CO2 the odds of a reported headache doubled; a 7-day average below 2.5 mmHg keeps the risk under 1 % | Law et al., *J Occup Environ Med* 2014 | A headache is read together with cabin CO2 |
| NASA-STD-3001 Vol. 2 Rev D [V2 6004] limits the 1-hour average ppCO2 to 3 mmHg, which keeps headache incidence below 1.4 % | NASA OCHMO ECLSS and CO2 technical briefs | The CO2 context rule uses the daily maximum of the hourly average against 3 mmHg |
| ISS effective dose accumulates at about 0.2–0.5 mSv/day, 40–90 mSv in a six-month mission; career limit 600 mSv; 250 mSv per solar particle event | Simonsen, NASA ASCEND 2025; NASA OCHMO-TB-020 | The dose counter is shown against these reference limits |
| Neutrons contribute about 30 % of the radiation dose on the ISS | CSA, *Monitoring radiation for astronaut health* (2026) | Declared limit of the dose module: the silicon detector used does not separate that component |
| A solar radiation storm begins when the ≥10 MeV proton flux reaches 10 pfu (S1 on the NOAA scale) | NOAA SWPC Space Weather Scales | Storm mode threshold |
| Spaceflight-associated neuro-ocular syndrome (SANS) affects a large share of long-duration crew | Lee et al., *npj Microgravity* 2020 | Visual symptoms are self-reported; diagnosis needs fundoscopy or OCT, so coverage is declared partial |

**Why existing tools do not close the gap.** The ISS BP/ECG kit is bulky and power-hungry by NASA ExMC's own account; CSA's Bio-Monitor garment (ECG, blood pressure, respiration, skin temperature, SpO2, on the ISS since 2018) is designed to send data to the ground; private medical conferences assume near-instant communication; EIMO is a framework, not a product the crew uses today; other prototypes from this challenge are vital-sign dashboards with fixed population thresholds, with the environment, when present, in a separate panel. VIGÍA fills the layer that turns data into a decision on board, without Earth and with context.

---

## 4. Data: NASA and partner sources

All environment data come from public APIs, enter a data lake, are re-anchored to the mission timeline by an explicit scenario and are shown in the app with their source and real date. Crew physiology is not public: individual astronaut medical data are protected under the Privacy Act and accessed on request through NASA LSAH/LSDA; there is no public real-time biomedical telemetry. That is why crew physiology in VIGÍA is entered by the user (or the watch) or simulated and labelled.

| Dataset | Agency / API | What VIGÍA ingests (verified 14–15 Nov 2026) | What it feeds |
| --- | --- | --- | --- |
| **RadLab** (radiation portal and Data API) | NASA OSDR | ALTEA-Survey detector, US Lab, ISS: absorbed and equivalent dose rates, 12–16 November 2011 (6,157 rows, 60-s cadence) | Ambient dose on the Environment screen and dose context of each alert; equivalent dose is used because NASA limits are in mSv |
| **Environmental Data Application (EDA)** | NASA OSDR | Rodent Research-1, ISS: cabin CO2 (ppm), temperature, relative humidity, 21–25 September 2014, 5-minute telemetry (1,440 rows) | Cabin profile; CO2 enters the "headache + CO2" rule after conversion to partial pressure |
| **DONKI** (Space Weather Database Of Notifications, Knowledge, Information) | NASA CCMC, via api.nasa.gov and ccmc.gsfc.nasa.gov | Solar energetic particle (SEP) events of the May 2024 storm period (14 events); live query of the last 30 days | A SEP event switches storm mode on for the whole crew on its real start time |
| **GOES integral proton flux** | NOAA SWPC | Last 24 h, 5-minute averages (858 rows); three of the eight channels are kept (≥10, ≥50, ≥100 MeV) | Storm severity; S1 threshold of 10 pfu at ≥10 MeV |
| **HRP resources** (5 Hazards, Risks, Ongoing HRP Research) | NASA HRP | Reference material | Structure of the body figure, alert labels, content and sources of the fact sheets, 17-risk coverage table |
| **Inspiration4** (OSD-569, OSD-575) | NASA OSDR | Blood chemistry of 4 crew members | The only real human clinical reference we used, cited for within-person variability; not integrated as live data |
| **Bio-Monitor** | CSA | Signal list (ECG, BP, respiration, skin temperature, SpO2, activity) | Signal schema of the data model; the Galaxy Watch4 stands in for it in the demo |

**Re-anchoring to the mission timeline.** Real series come from different missions and years and cannot be overlaid by date. From each source a continuous real window is chosen; its first timestamp is assigned to a mission day and the rest shifted by the same offset. Values are never scaled, smoothed or interpolated. Every point keeps its real UTC time (`t_real`) next to its mission time (`t_mision`). Series are aggregated to a common 5-minute grid and to daily summaries (maximum proton flux, maximum hourly CO2 average, dose of the day). A coincidence between a 2014 CO2 window and a 2024 storm on the same mission day is a scenario decision; the app never presents it as an observed fact. When DONKI, GOES and RadLab are requested for the same real dates (for example May 2024) the relation is real and is said so.

**Provenance labels.**

| Element | Nature | Label in the app |
| --- | --- | --- |
| Dose, proton flux, SEP events, cabin telemetry | Real measurement, re-anchored | "Real", with source and original date |
| Mission calendar and the day each window falls on | Scenario | "Scenario" |
| Crew vital signs, sleep, mood, symptoms in demo mode | Simulation with declared assumptions | "Simulated" (demo mode only) |
| Injected anomalies (drift, CO2 spike, 200 pfu storm) | Simulation | "Simulated" (demo mode only) |
| Readings the crew member enters in real mode | User measurement | "Measured" |

**Mission profiles and CO2 conversion.** EDA and most sensors report CO2 in ppm, but the physiological limit is a partial pressure, so the same ppm reading means different pressures in different habitats: `ppCO2 (mmHg) = ppm × P_cabin (mmHg) / 10^6`.

| Profile | Cabin pressure | O2 | Gravity | 3 mmHg CO2 equals | One-way delay in profile |
| --- | --- | --- | --- | --- | --- |
| Station (ISS) | 14.7 psia (760 mmHg) | 21 % | 0 g | 3,950 ppm | 0–1 s |
| Transit to Mars | 14.7 psia (760 mmHg) | 21 % | 0 g | 3,950 ppm | 180–1,320 s (3–22 min) |
| Docked transit / Gateway-like (EVA preparation atmosphere) | 10.2 psia (527 mmHg) | 26.5 % | 0 g | 5,690 ppm | 1–3 s (light time) |
| Lunar surface (exploration atmosphere) | 8.2 psia (424 mmHg) | 34 % | 0.165 g | 7,070 ppm | 1–3 s (light time) |
| Mars surface (proposed exploration atmosphere) | 8.2 psia (424 mmHg) | 34 % | 0.38 g | 7,070 ppm | 180–1,320 s |

Sources: NASA HRP Evidence Report on hypobaric hypoxia (NTRS 20150021491), ICES-2022-196 and ICES-2023 (NTRS 20230009095), NASA/TP-2010-216134. Gateway's nominal atmosphere is 14.7 psia; 10.2 psia / 26.5 % applies in EVA preparation. No surface mission has a fixed atmosphere yet; the values are NASA's recommended or planned nominal ones and are stored in the profile file, not in code. 3,950 ppm is the limit on the ISS, but at 8.2 psia the same reading is only 1.7 mmHg: a fixed ppm threshold would give false alarms on the surface and miss 5.4 mmHg on the station.

**Why the NASA data are indispensable.** Without RadLab there is no dose counter; without DONKI and GOES there is no storm mode; without EDA the engine cannot separate an environmental symptom from a physiological one; without the HRP pages the fact sheets have no grounding.

---

## 5. Architecture

Monorepo organised by deployable unit (`apps/`, `pipelines/`, `packages/`, `tools/`); `apps` and `pipelines` never import each other and communicate only through data contracts in `packages/schemas`.

| Layer | Component | What it does | Key decisions |
| --- | --- | --- | --- |
| Ingestion | `pipelines/datalake` (Python, standard library only) | Probes GOES, DONKI, RadLab and EDA, validates HTTP status and structure, cleans and stores raw response and clean rows with URL, query time and SHA-256 in `manifest.json` (medallion pattern raw → curated → gold) | `data/raw/` is never overwritten; an unexpected structure raises `EstructuraInesperada` and nothing is written |
| Re-anchoring and simulation | `pipelines/reanclaje` | Places real windows on the mission timeline, publishes the gold zone (panels for real and demo scenarios), runs the simulator and the parameter sweep | Double timestamp on every point; outputs committed as fixtures (`kpi.json`, `barrido.json`, `caso-referencia.json`) |
| On-board API | `apps/api` (FastAPI + SQLite, standard-library storage) | Serves the verified gold zone (SHA-256 checked against the manifest before every response; fails closed), stores the crew record (readings, symptoms, baseline, alerts, escalations, delay queue, audit), bridges the watch | Represents the spacecraft's local compute, not a cloud; `alerta`, `escalamiento` and `auditoria` tables are append-only (triggers); re-sending the same alert returns the existing id |
| Web app | `apps/web` (Next.js 16, React 19, TypeScript, Tailwind CSS 4, three.js) | Eight screens: Body, Check-in, Trends, Environment, Alerts, Reports, Device, About; Spanish and English | Installable PWA; the engine runs in the browser; the app only knows the API and opens without it after the first visit |
| Engine | `packages/engine` (pure TypeScript, no IO) | Layers A, B, C and context rules; 1:1 port of `evaluar_tripulante` in the Python simulator with a parity test | If a rule changes it changes on both sides; the fixture is regenerated from the Python reference |
| Contracts | `packages/schemas` | JSON Schema for readings, alerts, environment gold and the reference case; mission profiles; indicator fact sheets with sources (Spanish and English) | The pipelines, API and app all validate against them |
| Translations | `packages/i18n` | Spanish primary, English secondary; every visible string comes from the catalogue | Tests fail on a key present in English but missing in Spanish |
| Tooling | `tools/` | Context generator for MODULE files, anatomical model processing (BodyParts3D), reference validator (Crossref/Europe PMC), watch synchronisation notes | — |

**Offline.** A hand-written service worker (`public/sw.js`) caches the app shell (the HTML of the eight screens, static assets and the 3D model) on install; navigation is network-first with the cache as fallback; API calls are not intercepted. Catalogue and environment panel are copied locally on first load; if the API does not answer, the app opens with the local copy, shows "no link", and retries every 30 s and when the network returns. Check-ins and red escalations queue locally and sync when the link returns. The service worker is registered only in production; the independent tester verified on the public site that navigation and reload work with the network off (cache `vigia-carcasa-v1`, 33 entries). Only the first opening on a device needs a link.

**Privacy and roles.** Three roles: astronaut, crew medical officer (CMO) and flight surgeon on the ground. Green and amber never leave the device. Only a red layer-A alert is escalated automatically and immediately to the CMO (or to the commander or designated backup if the CMO is the patient) with the minimum data: indicator, value, time and clinical band — no history, no other indicators. The astronaut sees on screen that the notice went out and what it contained, cannot cancel it but can add context once; the rule is accepted before flight as part of the crew agreement. Environment alerts and storm mode are shared with the whole crew as environmental data, never as individual symptoms. Every access by another role is written to the append-only audit table. After three consecutive amber days the app recommends sharing but does not share.

**Delay queue.** Reports the astronaut sends to the ground wait the one-way delay of the active profile before "arriving"; a server-side clock marks them delivered with the real server time; the flight surgeon reads and answers from the ground view, and the reply travels back under the same delay. In demo mode the queue is shortened to about one minute and says so; in real mode the full delay applies.

**Galaxy Watch4 via smart-monitor.** The team's own server (smart-monitor) receives the watch stream; the API connects to it as a panel and persists only valid check-in values (resting heart rate and SpO2, `origin = sensor`, `method = galaxy_watch4`), never the 1 Hz stream. The app pre-fills the daily resting heart rate (median of the lowest 5-minute window with the watch on the wrist and no movement — never an instantaneous pulse) and the SpO2 of the last 12 hours, shows the live pulse on the 3D body and a 5-minute HRV. The watch does not provide usable blood pressure or temperature: its blood pressure is a pulse-wave estimate calibrated against a cuff every 28 days, and that calibration assumes a vascular state that spaceflight changes by 39 %; it has no temperature sensor and skin temperature would not represent core temperature in microgravity. Both stay manual with a declared method. A switch of measuring instrument is detected and resets the baseline window of that indicator, pausing layers B and C for 8 days (5 minimum readings plus the 3-day lag). The watch is consumer electronics presented as a demonstration stand-in for a garment such as Bio-Monitor, not as proposed flight hardware.

**Real mode and demo mode.** Real mode is the default: only user or watch data plus the measured environment; an unavailable source shows "no data" and, with no check-in yet, the body says "no check-in yet" instead of "all in range". Demo mode (`?modo=demo` or the Data selector) shows the simulated 30-day crew member of the reference case (demo day 27) with a banner on every screen, a separate local store, and no upload or escalation. The audit of 15 November found and the team fixed three ways in which simulated or default values could have reached the real store (pulse simulator active outside demo, a default mood of 7 saved without confirmation, and the demo ground thread leaking into the real thread); regression tests now guard them.

---

## 6. The hybrid engine in detail

The engine does not diagnose. It asks three questions about every check-in, then reads the environment. No single layer suffices: a statistical threshold alone is unsafe for safety variables, and a fixed clinical threshold is blind to slow drift.

| Layer | Variables | Rule | Output |
| --- | --- | --- | --- |
| **A. Clinical safety** | SpO2, temperature, systolic BP, resting HR | NEWS2 per-parameter bands (RCP, 2017) on 4 of its 7 parameters; **own aggregation cut-offs**: red if one parameter is in its extreme band (3 points) or the sum is 5 or more; amber if the sum is 3 or 4 | Red (automatic escalation) or amber. Active from day 1, needs no baseline |
| **B. Personal deviation** | Resting HR, systolic BP, glucose, sleep, mood | Modified z-score against the current baseline, two consecutive days (glucose, weekly: two consecutive readings) | Amber; informative only in adaptation (days 1–14) |
| **C. Slow drift** | Resting HR (upwards), sleep and mood (downwards) | One-sided CUSUM, k = 0.75, h = 5, from day 21; sum reset after each alert | Amber |
| **Context** | Symptoms and environment | Cabin CO2 > 3 mmHg (daily maximum of the hourly average) with reported headache; GOES ≥10 MeV flux ≥ 10 pfu or a DONKI SEP event | Crew-level environment alert (amber, no personal data); storm mode. A symptom the environment does not explain gives a personal amber on its body zone |

**Layer A bands used.**

| Parameter | Extreme band (3) | 2 points | 1 point | Normal |
| --- | --- | --- | --- | --- |
| SpO2 (%) | ≤ 91 | 92–93 | 94–95 | ≥ 96 |
| Temperature (°C) | ≤ 35.0 | ≥ 39.1 | 35.1–36.0; 38.1–39.0 | 36.1–38.0 |
| Systolic BP (mmHg) | ≤ 90; ≥ 220 | 91–100 | 101–110 | 111–219 |
| Heart rate (bpm) | ≤ 40; ≥ 131 | 111–130 | 41–50; 91–110 | 51–90 |

What is NEWS2 and what is ours: the per-parameter bands match the RCP chart one by one. The aggregation does not: the RCP defines 0–4 as low risk, a single 3 as low-medium (urgent ward review), 5–6 as medium and 7 or more as high, over seven parameters including respiratory rate, consciousness and supplemental oxygen, which VIGÍA does not record. VIGÍA's cut-offs are therefore the team's, deliberately more conservative, applied to a sum that is systematically lower; they are prototype rules a flight surgeon must review before any real use. A planned metrology correction (applying the 1- and 2-point bands only when the reading also departs from the profile baseline, because systolic pressure, core temperature and SpO2 shift in flight for physical reasons) is **not implemented** in either engine; the fact sheets declare it pending.

**Layer B.** For a reading *x* with the median and median absolute deviation (MAD) of the current baseline, `M = 0.6745 × (x − median) / MAD`. Threshold |M| ≥ 3.5 for physiological variables (Iglewicz and Hoaglin; NIST e-Handbook §1.3.5.17) and 3.0 for self-reported behavioural ones (sleep, mood), two consecutive days in both cases. Each variable has a dispersion floor (`mad_min`: HR 2.5 bpm, systolic 4 mmHg, glucose 6 mg/dL, sleep 0.4 h, mood 1.0) so that a very stable baseline does not turn noise into alerts. SpO2 and temperature do not pass through this layer. A value not measured is `null`: it does not score, does not alert and breaks the two-day persistence (weekly glucose is the exception).

**Baseline from pre-flight to in-flight.**

| Flight days | Reference | Active layers |
| --- | --- | --- |
| Pre-flight (14 days) | Ground baseline is recorded | — |
| 1–14 (adaptation) | Ground baseline, informative only; from day 8 the in-flight window starts filling without being used | A and context alert; B and C compute and display but do not alert |
| 15–20 (blend) | Progressive mix of ground and flight, weight `w = min(1, (d − 14) / 7)` on centre and dispersion | A, B and context |
| 21 onwards | In-flight baseline | A, B, C and context |

The in-flight window takes up to 14 readings, starts on day 8 and ends 3 days before the evaluated date, so that a drift in progress is not absorbed into its own reference; days with an alert or a threshold crossing are excluded; at least 5 readings are needed. The engine does not know the shifts used by the simulator: the in-flight reference comes only from the readings. A crew member without a ground baseline is evaluated with layer A from day 1 and with B and C once the window holds 5 readings. The 14/21-day schedule is a conservative design decision, not a validated clinical value (Mishra et al. 2020 used a 28-day baseline on wearable data).

**Layer C.** CUSUM accumulates small, sustained one-sided deviations and alerts when the sum exceeds h = 5; k = 0.75 targets a 1.5σ shift and reduces false alarms relative to the textbook k = 0.5. Both values were tuned in simulation with a sweep of nine combinations (`index.py barrer`, published as `barrido.json`), not taken from the literature. The layer only starts on day 21 because the adaptation shift would trigger it earlier. The same architecture (personal resting-HR baseline plus online CUSUM) detected infections before or on the day of symptoms in 15 of 24 cases on wearable data (Mishra et al., *Nat Biomed Eng* 2020) and in 80 % of infected participants in a prospective study of 3,318 people (Alavi et al., *Nat Med* 2022); that evidence is terrestrial and validates the method, not its use in flight.

**Context rules.** The CO2 rule is VIGÍA's design inference from Law 2014 and NASA-STD-3001, not a NASA operational protocol: two crew members reporting headache with cabin CO2 above 3 mmHg produce one environment alert ("check ventilation and repeat"), not two medical alerts. Storm mode is set by a DONKI SEP event or a GOES ≥10 MeV flux of 10 pfu or more and recommends shelter and a list of acute symptoms to watch; readings taken during the event are flagged so that later nausea is read with that antecedent. Because CO2 is converted with the cabin pressure of the active profile, the same ppm reading can be an alert on the station and not on the lunar surface.

---

## 7. Validation

**Simulation protocol** (`pipelines/reanclaje/simulacion.py`, `index.py simular`). Each mission has 30 flight days, 14 pre-flight days and 4 crew members. Three known anomalies are injected and passed through the Python reference engine; the same number of control missions without anomalies measures false alarms.

| Case | Injected | When | Expected |
| --- | --- | --- | --- |
| A1. Cardiovascular drift from sleep loss | Sleep −0.20 h/day, resting HR +1 bpm/day, mood −0.15/day in one crew member | Days 18–27 | Amber by layer B or C within the window |
| A2. Headache from a CO2 spike | Maximum hourly CO2 of 4.6 mmHg; two crew members report headache | Day 12 (adaptation) | One environment alert for both, not two medical alerts |
| A3. Solar storm | 200 pfu at ≥10 MeV for two days | Day 22 | Storm mode the same day |

Generator assumptions, all declared in `kpi.json`: sustained in-flight shifts of +3 bpm resting HR, −0.7 h sleep and −4 mmHg systolic, with an acute adaptation decaying with a 4-day constant. These are a **stress scenario for the detector**, not a reproduction of the literature: Norsk 2015 found 24-h heart rate unchanged and systolic −8 mmHg; Barger 2014 reports 6.09 h of sleep; no source gives a 4-day adaptation constant. The KPIs were not recomputed with other values.

**Results** (reference engine; 500 anomaly missions and 500 control missions; seed 2026; `packages/engine/fixtures/kpi.json`).

| KPI | Full intensity | Half intensity | Reading |
| --- | --- | --- | --- |
| A1 drift detected | 99.8 % | 17.8 % | Sensitivity falls sharply with weak drifts; 99.8 % is not presented as general |
| Days from drift onset to alert (median) | 8 | 9 | — |
| A2 CO2 + headache detected | 100 % | 100 % | Deterministic rule |
| A3 storm detected | 100 % | 100 % | Deterministic rule |
| Fixed terrestrial threshold (HR ≥ 91 bpm) fired | 0 % | 0 % | The lead over a fixed threshold cannot be computed; the finding is that it never sees the drift |
| Control missions with any false alarm | 0.2 % | — | 0.0 % chance alert inside the A1 window |
| False alarms per crew member per week, days 1–14 | 0.0003 | — | Layer A only; B and C do not alert in adaptation |
| False alarms per crew member per week, days 15–30 | 0.000 | — | — |
| Independent validation, seed 2027 | 99.8 %, 8 days; 0.0 % false alarms | — | Same result with a second seed |

**What the numbers do and do not mean.** They come from the reference engine on data generated by the same team: they do not measure clinical performance. The near-zero false alarms reflect Gaussian noise and wide dispersion floors, not a property of real crews; the same floors explain why the half-intensity drift is caught in only 17.8 % of missions. Lowering k to 0.5 advances detection by one day in the sweep; it was not changed, to avoid tuning the parameters to the anomaly to be detected. What the numbers do show is that a personal-baseline engine sees a drift a fixed threshold never does.

**Parity.** The simulator exports `caso-referencia.json` with the day-by-day readings and expected alerts of the four simulated crew members; `packages/engine/paridad-referencia.test.ts` requires the TypeScript engine to reproduce it alert by alert, and `test_simulacion.py` requires the fixture to be identical to the generator's output. The simulation figures therefore hold for the engine the app runs.

**Automated tests at the time of the audit (15 November 2026).**

| Suite | Scope | Count |
| --- | --- | --- |
| Python `unittest` (8 suites) | Data lake ingestion and manifest, re-anchoring and simulation (fixture identity), API (routes, storage, privacy and escalation rules, delay queue, watch bridge, OpenAPI documentation of every route), schemas and fact sheets, i18n catalogue rules, context generator | 192 tests before the audit, plus 2 guard tests added for real/demo separation |
| Node `node:test` | Engine parity and instrument change; web library: engine adapter, alert sync, API registration, catalogue cache, queue, synchronisation, watch state machine | 57 tests |
| Type check and build | `tsc --noEmit` without errors; `next build` of the PWA | Run manually after the corrections |
| Not automated | Service worker (offline), 3D body, interface | Verified by hand and by the independent tester's headless-browser run (eight screens × four mode/language combinations, empty/loading/error/offline states, the full real-mode flow from check-in to red escalation recorded in the API) |

---

## 8. User experience

**Gather → evaluate → act.** The Body screen opens with the overall status and the "Start check-in" button. The check-in presents one measurement per step, with its unit, the last known value preset on a dial with +/− buttons and a slider, and two short texts from the fact sheet: how to measure it in the active mission profile and why it matters. Only confirmed or adjusted values are saved; a skipped measurement is stored as "no data", never as 0. A 90-second timer and progress bar run during the check-in. The result screen states the day's status and "what to do now" per body zone; the Body screen colours the organs of each system and beats at the measured heart rate; Trends shows each indicator against its personal band; Environment shows dose, proton flux, SEP events and cabin CO2, temperature and humidity, each labelled Real or Simulated with source and real date; Alerts shows every alert with its layer, threshold, who can see it and exactly what left the device; Reports shows the delay queue and the flight surgeon's replies; Device shows the watch; About explains the project, the engine, the data, the limits and the use of AI.

**Accessibility and touch-first choices** (designed for a 19-inch touch screen; verified by the tester with element measurements). Touch targets of 48–56 px or more everywhere: dials 80 px, options 56 px, tabs 64 px, main buttons 64 px. Nothing depends on hover. Numeric entry uses dials and sliders, not a keyboard, so gloved or floating use is possible; the slider also responds to arrow keys and the buttons to Enter/Space. Every button, input and select has an accessible name; dials use `role=group` with `aria-label`, mood and measurement site use `role=radiogroup`, the progress bar exposes `aria-valuenow`, the timer is `role=timer`, the result receives programmatic focus as `role=status`; a skip link is visible on focus. Fonts (Space Grotesk, IBM Plex Mono) are bundled, so the interface needs no network to render. Light theme by default with a dark theme; the tester noted that the green and amber small-text colours on the light background fall just below the WCAG AA 4.5:1 contrast ratio (3.77:1 and 3.75:1) while all pass in the dark theme.

**Languages.** Spanish is the primary language and English the secondary one; all visible strings come from `packages/i18n` (760 keys per catalogue, none missing), and the API serves fact sheets and reminders in English with `lang=en`. Some texts from the data (ground-thread messages, demo report content, a few units) remained in Spanish in the English interface at the time of the audit.

**Real mode versus demo mode.** The public demo link opens the labelled simulated crew member on day 27, where the drift of case A1 is visible (heart-rate CUSUM and short sleep as amber alerts). Real mode is the default on every device; on the public site all visitors share a single test crew member because authentication is not implemented, and the site displays a notice about it.

**Not a medical device.** The footer of every screen, the About page, the web manifest and the README state that VIGÍA is a decision-support prototype, that its thresholds are prototype rules with cited sources and not clinically validated flight limits, and that it is not a medical device.

---

## 9. Impact and users

| User | Need | What VIGÍA gives |
| --- | --- | --- |
| Astronaut (primary) | Know within a minute whether they are fine and what to do if not | Daily status, explanation and action; control over what is shared |
| Crew medical officer | See the whole crew and prioritise, even when the patient is the CMO | Crew view with the escalations each member's rules authorised; backup routing to the commander |
| Flight surgeon on the ground | Complete reports that do not require round-trip questions | A package with reading, baseline, environment with provenance and the action taken, delivered under the mission delay, with a reply channel |
| Analog missions and remote settings (secondary) | The same autonomy in Antarctic stations, analog habitats or rural communities | The same engine with another environment profile; CSA already points to terrestrial uses of Bio-Monitor in communities with limited access to care |

The two central user profiles come from the challenge statement itself, which names the crew and the flight surgeon as those who must act on the results. The team did not run interviews or a usability study; user validation is therefore not claimed and is the first item of the roadmap.

**Mission environments.** Five profiles cover the station, the transit vehicle (free-flying and docked), the lunar surface and the Mars surface; each changes the cabin pressure used in the CO2 conversion, the gravity used in the measurement instructions, the delay of the report queue and the detector of the dose module. RadLab also covers deep-space detectors (CRaTER in lunar orbit, LND on the lunar surface, MSL-RAD on Mars, Liulin-MO on ExoMars TGO, BioSentinel), so each profile can be fed by a real detector of its environment in a later version.

**Impact by dimension.** Social: health autonomy for whoever is far from a physician, in space and on Earth. Scientific: a per-person record that joins health and environmental exposure, the kind of data that research on hazard interaction needs. Operational: fewer round-trip consultations per event. No quantified economic impact is claimed because there are no data to support one.

---

## 10. Declared limits and roadmap

**Limits of the prototype.**

- No real astronaut physiology is used; demo physiology is simulated with declared assumptions. Individual astronaut medical data are protected (Privacy Act, LSAH/LSDA) and no public real-time telemetry exists.
- Layer A uses NEWS2, a terrestrial hospital standard, on 4 of its 7 parameters with the team's own aggregation cut-offs. Every threshold is a prototype rule with a cited source, not a clinically validated flight-medicine limit; a flight surgeon must review them before any real use. The planned metrology correction of the 1- and 2-point bands is not implemented.
- The simulator's in-flight shifts (resting HR +3 bpm, systolic −4 mmHg, sleep −0.7 h, 4-day adaptation constant) are a stress scenario, not a reproduction of the literature (Norsk 2015: heart rate unchanged, systolic −8 mmHg; Barger 2014: 6.09 h of sleep). The KPIs are optimistic: Gaussian noise, wide dispersion floors, generator written by the same team.
- The 14/21-day baseline schedule, the 8-day pause after an instrument change and the CUSUM parameters are design decisions tuned in simulation, not clinical values.
- Radiation is ambient dose from an area detector, not personal dose; the detector used does not separate the neutron component (about 30 % on the ISS). GOES measures at geostationary orbit: it indicates severity and timing, not crew dose. In the real-mode scenario the cabin window covers only the first mission days and the live DONKI query returned no SEP event in the last 30 days.
- The lunar delay in the profile (1–3 s) is light time; NASA expects 5–12 s of operational delay on Artemis. The value lives in the profile file and can be changed without touching code.
- Not implemented: body mass in layer C, SpO2 baseline reset on profile change, body-mass correction by local gravity, the PVT-B vigilance test, check-in streaks, camera input, storage encryption and crew authentication (the on-board API identifies the crew member by a header; the public site shares one test crew member).
- Fingertip pulse oximetry has been shown valid in microgravity only in small, short-flight samples (Conkin et al. 2017); there is no long-duration validation against blood gases. Wrist-worn blood-pressure estimates are not used in flight for the reasons given in §5.
- No usability study, no timing of the 90-second goal with people outside the team, and no SUS score were obtained; they are stated as targets, not results.
- Items recorded by the independent UI audit of 15 November 2026 (mobile tab bar hiding six sections at 390 px, About page served in Spanish under `lang=en`, blank screen during slow loads, toasts covering content, small-text contrast in the light theme) are tracked in `auditoria/`; their status at submission is recorded there, not here.

**Roadmap** (applications to open programmes, not alliances).

| Horizon | Goal | Deliverables |
| --- | --- | --- |
| 3 months | Validate the engine on real, public human data | Test on open terrestrial wearable datasets; rule review by a physician; usability study with 10–15 people; implement the layer-A metrology correction and body mass in layer C; Galaxy Watch route with Samsung Health Sensor SDK (SpO2, IBI, accelerometer) |
| 6 months | Test in an isolated setting | Pilot in an analog mission or remote station (NASA HERA and HERO calls, TRISH; CSA as the natural partner through Bio-Monitor); integration with a commercial sensor garment; reports in HL7 FHIR; PVT-B vigilance test; encryption and authentication |
| 12 months | Approach a decision-support system | Versioned, audited rule library; deep-space dosimetry module using RadLab's deep-space detectors per profile; collaboration proposal with aerospace-medicine groups; terrestrial version for rural health |

---

## 11. Use of AI

AI coding assistants were used as tools: Claude (Anthropic) through Claude Code, and OpenAI Codex as an independent reviewer, to research public NASA, CSA and NOAA sources, to draft and review documentation and the submission text, and to help write, review and test code. The problem framing, the choice of indicators and engine rules, the data sources and the design decisions are the team's; every cited source was checked by the team, and scientific references were validated against Crossref and Europe PMC with the team's own validator (`tools/validar-referencias`). An independent source audit (`auditoria/FUENTES.md`) classified every scientific claim and threshold as supported, partial, unsupported or incorrect; the corrections it required (NEWS2 attribution, simulator assumptions, space motion sickness duration, an unsupported CO2 headache range) are reflected in this report. No AI-generated images, video or audio are used: the 3D body is a processed open anatomical model (BodyParts3D), and the logo, icons and illustrations were drawn by the team. No NASA logos, flags or mission identifiers are used or modified.

---

## 12. References

**NASA and partner agencies**

- NASA HRP, *5 Hazards of Human Spaceflight*: https://www.nasa.gov/hrp/hazards/
- NASA HRP, *Risks of Human Spaceflight*: https://www.nasa.gov/hrp/risks/
- NASA HRP, *Ongoing HRP Research in Space*: https://www.nasa.gov/hrp/ongoing-hrp-research/
- NASA NTRS, *Earth-Independent Medical Operations Concept of Operations* (2024; 2025 revision).
- NASA Ames, Parisi et al. 2024, communication delay and crew autonomy: https://hsi.arc.nasa.gov/publications/AHFE_2024_Parisi.pdf ; NASA ASCEND, *Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions* (NTRS 20220013418).
- NASA OSDR, RadLab portal and Data API: https://visualization.osdr.nasa.gov/radlab/ ; ALTEA knowledge base: https://visualization.osdr.nasa.gov/radlab/kb/ALTEA
- NASA OSDR, Environmental Data Application: https://visualization.osdr.nasa.gov/eda/ ; https://www.nasa.gov/reference/osdr-environmental-data
- NASA OSDR portal and FAQ: https://osdr.nasa.gov/ ; https://science.nasa.gov/reference/osdr-faq/ ; NASA Life Sciences Portal: https://nlsp.nasa.gov/
- NASA CCMC, DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/ ; NASA Open APIs (api.nasa.gov).
- NASA OCHMO, ECLSS technical brief (NASA-STD-3001 Vol. 2 Rev D [V2 6004], CO2 ≤ 3 mmHg 1-h average): https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf ; OCHMO-TB-004 Carbon Dioxide: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
- NASA OCHMO-TB-020, Radiation Protection (600 mSv career; 250 mSv per SPE): https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
- Simonsen L., NASA ASCEND 2025, ISS dose rates (NTRS 20250006168).
- NASA HRP Evidence Report, *Risk of Hypobaric Hypoxia from the Exploration Atmosphere* (NTRS 20150021491); *Designing an Exploration Atmosphere Prebreathe Protocol* (NTRS 20140012830); NASA/TP-2010-216134; ICES-2022-196 (NTRS 20220006727); ICES-2023 transit habitat presentation (NTRS 20230009095); Garbino 2024 (NTRS 20240005151).
- NASA LSAH/LSDA, Van Baalen 2017 (NTRS 20170009502): access to astronaut health data under the Privacy Act.
- NASA NTRS 20190000238, Astroskin/Bio-Monitor evaluation in HERA.
- CSA, *Monitoring radiation for astronaut health* (26 February 2026): https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, *Why do we conduct science experiments in space?*: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- CSA, Bio-Monitor / Astroskin: https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp
- NOAA SWPC, GOES integral proton flux (JSON): https://services.swpc.noaa.gov/json/goes/primary/ ; Solar Radiation Storms and NOAA Space Weather Scales: https://www.swpc.noaa.gov/noaa-scales-explanation
- Royal College of Physicians, *National Early Warning Score (NEWS) 2* (2017), Chart 2 thresholds and triggers: https://www.rcp.ac.uk/media/2acdezkd/news2-chart-2_news-thresholds-and-triggers_0.pdf

**Peer-reviewed literature** (DOIs validated with Crossref; see `documentacion/referencias-validadas.md`)

- Patel Z.S. et al., *npj Microgravity* 2020, five hazards and >30 risks. doi:10.1038/s41526-020-00124-6
- Afshinnekoo E. et al., *Cell* 2020, fundamental biological features of spaceflight. doi:10.1016/j.cell.2020.10.050
- Norsk P. et al., *J Physiol* 2015, fluid shifts, vasodilatation and ambulatory blood pressure reduction. doi:10.1113/jphysiol.2014.284869
- Barger L.K. et al., *Lancet Neurol* 2014, sleep deficiency in astronauts. doi:10.1016/S1474-4422(14)70122-X
- Jones C.W. et al., *Sleep* 2022, sleep and neurobehavioural performance in 24 astronauts. doi:10.1093/sleep/zsac006
- Stahn A.C. et al., *Sci Rep* 2017, core body temperature in spaceflight. doi:10.1038/s41598-017-15560-w
- Zwart S.R. et al., *Aviat Space Environ Med* 2014, body mass changes during long-duration spaceflight. doi:10.3357/ASEM.3979.2014
- Williams D. et al., *CMAJ* 2009, acclimation during space flight. doi:10.1503/cmaj.090628
- Lang T. et al., *J Bone Miner Res* 2004, bone loss. doi:10.1359/JBMR.040307
- Lee A.G. et al., *npj Microgravity* 2020, SANS review. doi:10.1038/s41526-020-0097-9 ; Mader T.H. et al., *Ophthalmology* 2011. doi:10.1016/j.ophtha.2011.06.021
- Law J. et al., *J Occup Environ Med* 2014, CO2 and headaches on the ISS. doi:10.1097/JOM.0000000000000158
- Mishra T. et al., *Nat Biomed Eng* 2020, pre-symptomatic detection with wearables and online CUSUM. doi:10.1038/s41551-020-00640-6
- Alavi A. et al., *Nat Med* 2022, prospective real-time alerting from wearables. doi:10.1038/s41591-021-01593-2
- Radin J.M. et al., *Lancet Digit Health* 2020. doi:10.1016/S2589-7500(19)30222-5 ; Quer G. et al., *Nat Med* 2021. doi:10.1038/s41591-020-1123-x ; Li X. et al., *PLoS Biol* 2017. doi:10.1371/journal.pbio.2001402
- Leys C. et al., *J Exp Soc Psychol* 2013, median absolute deviation. doi:10.1016/j.jesp.2013.03.013
- Iglewicz B., Hoaglin D.C., *How to Detect and Handle Outliers*, ASQC 1993; NIST/SEMATECH e-Handbook §1.3.5.17.
- Page E.S., *Biometrika* 1954, continuous inspection schemes (CUSUM). doi:10.1093/biomet/41.1-2.100
- Smith G.B. et al., *Resuscitation* 2013, NEWS performance. doi:10.1016/j.resuscitation.2012.12.016 ; Pimentel M.A.F. et al., *Resuscitation* 2019, NEWS2 vs NEWS. doi:10.1016/j.resuscitation.2018.09.026
- Basner M., Mollicone D., Dinges D.F., *Acta Astronaut* 2011, PVT-B. doi:10.1016/j.actaastro.2011.07.015
- Sendelbach S., Funk M., *AACN Adv Crit Care* 2013, alarm fatigue. doi:10.1097/NCI.0b013e3182a903f9
- Marino M. et al., *Sleep* 2013, actigraphy validity. doi:10.5665/sleep.3142
- de Mol P. et al., *PLoS ONE* 2010, glucose meters at simulated altitude. doi:10.1371/journal.pone.0015485
- Conkin J. et al., *Aerosp Med Hum Perform* 2017, pulse oximetry with mild hypoxia and microgravity.
- Overbey E.G. et al., *Nature* 2024, Space Omics and Medical Atlas (Inspiration4 data in OSDR). doi:10.1038/s41586-024-07639-y
- Zeitlin C. et al., *Science* 2013, MSL-RAD cruise dose. doi:10.1126/science.1235989
- Kintz N.M., Palinkas L.A., *Aerosp Med Hum Perform* 2016, communication delay on the ISS. doi:10.3357/AMHP.4626.2016
- Garrett-Bakelman F.E. et al., *Science* 2019, NASA Twins Study. doi:10.1126/science.aau8650

**Models, fonts and software (open source)**

- 3D anatomy: BodyParts3D, © The Database Center for Life Science, CC BY 4.0, https://lifesciencedb.jp/bp3d/ ; processing scripts in `tools/modelo-anatomico`, attribution in `apps/web/public/modelos/ATRIBUCION.md` and visible in the app.
- Next.js (MIT), React (MIT), TypeScript (Apache-2.0), Tailwind CSS (MIT), three.js (MIT), lucide-react (ISC), Base UI (MIT), FastAPI (MIT), Uvicorn (BSD-3), SQLite (public domain), Python standard library.
- Fonts: Space Grotesk and IBM Plex Mono (SIL Open Font License), bundled with Fontsource.
- Wearable bridge: smart-monitor, the team's own Galaxy Watch4 server: https://github.com/smoraleslo/smart-monitor
- Samsung Health Sensor SDK and Android Health Services documentation (watch capabilities; blood-pressure calibration every 28 days).
- Logo, icons and illustrations drawn by the team. Code under the MIT License.

# Project Demo — 7 slides (English), draft 2026-11-15

Format chosen: **slide deck, 7 slides including the title slide** (official limit: 7 slides or a 30-second video; exceeding it excludes the project from Global Judging). A deck can be built in minutes from screenshots and needs no voice recording; a 30-second video is listed as alternative at the end. Required content per the Submission Guide: team name, team members, the challenge, an image of the project, the user experience, and how NASA and partner open data made the solution possible. All text in English. No NASA logos. No AI-generated images (screenshots of the app only).

Team fields: `[TEAM NAME]`, `[MEMBER 1, MEMBER 2, …]` exactly as registered on the Members tab.

Screenshots to take from https://vigia.smoraleslo.dev/?modo=demo&lang=en after the redeploy (1280×800, light theme): Body (home), Check-in step, Environment, Alerts, Reports. Label every screenshot that shows the simulated crew member with the on-screen "Demo" banner visible.

---

## Slide 1 — Title

**VIGÍA** — *When Earth can't answer, you're not flying blind.*

Team `[TEAM NAME]` · `[Members]` · `[Local Event, country]`
NASA Space Apps Challenge 2026 · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions*

Visual: app home screen (3D body, status green) with the VIGÍA logo. Footer: "Decision-support prototype, not a medical device."

## Slide 2 — The problem

- On a mission to Mars a message to the flight surgeon can take **up to 22 minutes each way**. No evacuation.
- NASA HRP's five hazards (radiation, isolation, distance, gravity, closed environment) reinforce each other.
- Today's health software sends data to Earth. **The crew needs to decide on board.**

Visual: one line ISS (<1 s) → Moon (1.3 s) → Mars (3–22 min); a delay counter.

## Slide 3 — The solution: gather → evaluate → act

1. **Gather.** Daily check-in in under 90 s: heart rate, blood pressure, SpO2, temperature, sleep, mood, symptoms, weekly glucose. Each indicator explains *how to measure it in this mission profile* and *why it matters*. A Galaxy Watch4 pre-fills resting HR and SpO2.
2. **Evaluate.** Three-layer hybrid engine: clinical safety bands (NEWS2 per-parameter bands, own cut-offs), deviation from *your own* baseline (pre-flight → in-flight), slow drift (CUSUM). The measured environment is part of the reasoning.
3. **Act.** Green/amber/red with the reason and the next step; red escalates to the crew medical officer with the minimum data; reports queue to Earth under the real delay.

Visual: check-in screen + body screen with an amber zone open ("why" and "what to do next").

## Slide 4 — How it works (one example)

Day 60: the astronaut reports a headache. A simulated cabin CO2 spike reaches 4.6 mmHg (> 3 mmHg, NASA-STD-3001). VIGÍA raises **one environment alert for the whole crew**, not a medical alert for one person. Day 22: a DONKI solar particle event and a GOES flux ≥ 10 pfu switch on **storm mode**. Days 18–27: sleep, resting HR and mood drift slowly; a fixed terrestrial threshold never fires, the personal baseline does.

Visual: Alerts screen with the environment alert (source and real date visible) and the trends chart with the personal band.

## Slide 5 — NASA and partner open data make it possible

| Data | Source | Role in VIGÍA |
| --- | --- | --- |
| Radiation dose (ALTEA-Survey, ISS) | **NASA OSDR RadLab** | Ambient dose on the Environment screen |
| Cabin CO2, temperature, humidity (Rodent Research-1, ISS) | **NASA OSDR EDA** | Headache + CO2 rule, converted with the cabin pressure of the mission profile |
| Solar energetic particle events | **NASA CCMC DONKI** | Storm mode for the whole crew |
| Proton flux ≥10 MeV | **NOAA SWPC GOES** | Storm severity (S1 = 10 pfu) |
| Hazards, risks, ongoing research | **NASA HRP** | Body figure structure, indicator fact sheets |
| Radiation monitoring, science in space | **CSA** | Dose module and its declared limits |

Every value shows **Real or Simulated**, its source and its real date. Series from different years are placed on one mission timeline by an explicit scenario.

Visual: Environment screen.

## Slide 6 — What we measured and what it means

- 500 simulated missions with anomalies + 500 controls (seed 2026): slow drift detected in **99.8 %**, 8 days after onset (median); the fixed threshold (HR ≥ 91 bpm) **never fired**; CO2 and storm rules **100 %**; false alarms **< 0.001** per crew member per week.
- Simulation, not clinical performance: Gaussian noise, generator written by the same team.
- Privacy by default: green and amber never leave the device; the astronaut sees exactly what was sent.
- Works offline: service worker, local queue, sync when the link returns.

Visual: three big numbers with the caption "simulation".

## Slide 7 — Limits, next steps, links

**Declared limits:** no real astronaut physiology (real mode = what you enter; demo = simulated and labelled); NEWS2 is a terrestrial standard and our cut-offs are prototype rules; ambient dose is not personal dose.

**Next 3 months:** flight-surgeon review of the rules, PVT-B vigilance test, personal dosimetry input, encryption and crew authentication, analog-mission pilot.

**Links:** https://vigia.smoraleslo.dev · demo in English: https://vigia.smoraleslo.dev/?modo=demo&lang=en · code: https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions

Credits: BodyParts3D © DBCLS, CC BY 4.0. Built with Next.js, three.js, FastAPI, Python. AI assistants (Claude Code, OpenAI Codex) used for research, documentation and code review; no AI-generated media.

---

## Alternative: 30-second video (English subtitles)

| Time | Subtitle | Image |
| --- | --- | --- |
| 0–3 s | "Team `[NAME]` · VIGÍA · Health Monitoring Software for Astronauts" | Title card |
| 3–8 s | "On the way to Mars, a message to your doctor can take 22 minutes each way." | Delay counter |
| 8–14 s | "VIGÍA lets astronauts evaluate their own health on board, offline." | Check-in in under 90 s |
| 14–22 s | "Clinical safety bands, your own baseline, and real NASA data: ISS radiation dose, cabin CO2, solar particle events." | Body amber; Environment screen with sources |
| 22–27 s | "It tells you why, and what to do next. Red alerts reach the medical officer with the minimum data." | Alert with next step; report in the queue |
| 27–30 s | "VIGÍA. When Earth can't answer, you're not flying blind." | Name and links |

Hosting: upload the PDF/PPTX or the MP4 to Google Drive or YouTube with public access ("Anyone with the link"), then open the link in a private window before pasting it in the form.

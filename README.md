# SelfHealingWindows

A small Node.js service that monitors a Windows PC for resource problems and can kill offending processes — with judgment delegated to a [pi](https://github.com/badlogic/pi-mono) agent running on `gpt-4o-mini`.

## What it does

- **Diagnostics**: CPU (total + per-process), memory (RAM + per-process with command lines for heavy consumers), disk (activity, latency, queue), GPU engine utilization, unresponsive GUI processes, and system uptime.
- **`/pi/ask`** — sends the full diagnostics snapshot to pi and returns its analysis of anything needing attention.
- **`/pi/heal`** — pi proposes a kill plan (PID + reason); the server validates every PID against a blocklist and offender thresholds, then executes the kills through an elevated PowerShell script. Returns a plaintext report of what was actually killed vs. skipped.
- **Startup task** — offers once to register a Scheduled Task that runs the server at sign-in with highest privileges (no UAC prompt at logon).

## Safety model

Pi never gets a shell for `/pi/heal` — it runs with `--no-tools` and only returns JSON describing what *should* die. The server then enforces:

- **Protected list** — `kill_proc.ps1` refuses system-critical names (`dwm`, `csrss`, `svchost`, `lsass`, …) plus the server's own PID. Pi cannot bypass this.
- **Offender gate** — a PID must be flagged by diagnostics (unresponsive, CPU > 3%, or private memory > 1500 MB) or match a `known_offenders` name (`ollama`, `lm studio`, …) before it reaches the kill script.

For `/pi/ask`, pi also runs tool-less — analysis only.

## Endpoints

| Route | Returns |
|---|---|
| `GET /` | endpoint list |
| `GET /all` | all diagnostics, freshly collected |
| `GET /system` `/disk` `/cpu` `/memory` | per-module diagnostics |
| `GET /pi/ask` | pi's analysis (plain text) |
| `GET /pi/heal` | kill plan + executed results (plain text) |

All diagnostics routes collect fresh data on each request.

## Running

```
npm install
npm run dev          # node server.js — port 3000
```

For the pi endpoints to work elevated (and silently, without per-call UAC prompts), launch the server elevated:

```
powershell -ExecutionPolicy Bypass -File .\run-admin.ps1
```

`run-admin.ps1` opens an elevated window with QuickEdit mode disabled (prevents accidental console-select freezes).

Once installed as a startup task, the server launches automatically at sign-in — already elevated, so no prompts ever appear.

## Files

```
server.js                  Express app, routes
prompt_pi.js               pi prompt/response handling, kill plan validation, report formatting
diagnostics/
  system.js                GPU engines, unresponsive processes, uptime
  cpu.js                   total CPU + per-process CPU (normalized to % of machine)
  memory.js                RAM totals + per-process memory (command_line for >200 MB)
  disk.js                  % disk time, avg latency, queue length
utils/
  execAsync.js             promisified child_process.exec
  pi_send.ps1              elevated one-shot pi invocation (prompt/reply via temp files)
  kill_run.ps1             elevated wrapper for the kill script
  kill_proc.ps1            blocklist + Stop-Process execution, JSON result
  install_task.js          startup-task prompt + installer
run-admin.ps1              manual elevated launcher (UAC once)
run-server.ps1/.cmd        scheduled-task launcher (QuickEdit fix + node)
stress_test.js             CPU/memory load generator for testing
```

## Tuning

Constants at the top of `prompt_pi.js`:

- `protected_processes` — names pi is told never to list (mirror of `kill_proc.ps1`'s enforced list — edit both if you change it)
- `known_offenders` — names always eligible for termination when running (`ollama`, `lm studio`, …)
- `offender_cpu_threshold`, `offender_memory_mb` — the diagnostic thresholds for the kill gate

`stress_test.js` for load testing:

```
node stress_test.js <cpu_workers> <mem_hogs> <mb_per_hog>
node stress_test.js 14 5 4096    # ~87% CPU + ~20 GB — real lag territory
```

## Requirements

- Node.js 18+ (ESM), `pi` CLI on PATH with `gpt-4o-mini` access (`pi auth` configured)
- Windows PowerShell 5.1 (built-in)
- `express` (only dependency)

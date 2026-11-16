import { writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import execAsync from './utils/execAsync.js';
import { get_system_stats, system_stats } from './diagnostics/system.js';
import { get_disk_stats, disk_stats } from './diagnostics/disk.js';
import { get_cpu_stats, cpu_stats } from './diagnostics/cpu.js';
import { get_memory_stats, ram_stats, process_memory } from './diagnostics/memory.js';

const tmp_dir = path.join(os.tmpdir(), 'selfhealing-windows');
const prompt_file = path.join(tmp_dir, 'pi_prompt.txt');
const reply_file = path.join(tmp_dir, 'pi_reply.txt');
const pid_file = path.join(tmp_dir, 'pi_kill_pids.json');
const kill_result_file = path.join(tmp_dir, 'pi_kill_result.json');
const utils_dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'utils');
const send_script = path.join(utils_dir, 'pi_send.ps1');
const kill_script = path.join(utils_dir, 'kill_run.ps1');

const protected_processes = ['idle','system','registry','memory compression','smss','csrss','wininit','winlogon','services','lsass','lsaiso','svchost','dwm','fontdrvhost','sihost','taskhostw','spoolsv','dashost','wudfhost','msmpeng','securityhealthservice','searchindexer','ctfmon','conhost','powershell','pwsh','cmd','pi'];
const known_offenders = ['ollama','ollama app','lm studio','lm-studio','lmstudio'];
const offender_cpu_threshold = 3;
const offender_memory_mb = 1500;

const send_to_pi = async (message, pi_args = '') => {
    await writeFile(prompt_file, message, 'utf8');
    await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${send_script}" -PromptFile "${prompt_file}" -ReplyFile "${reply_file}" -PiArgs "${pi_args}"`);
    const reply = (await readFile(reply_file, 'utf8')).replace(/^\uFEFF/, '').trim();
    await rm(reply_file, { force: true });
    return reply;
};

const collect_stats = async () => {
    await get_system_stats();
    await get_disk_stats();
    await get_cpu_stats();
    await get_memory_stats();
    return { system: system_stats, disk: disk_stats, cpu: cpu_stats, memory: { ram: ram_stats, processes: process_memory } };
};

const strip_markdown = (text) => text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}[-*+]\s+/gm, '- ');

const ask_pi = async (stats) => {
    const message = `You are an always-on self-healing agent for this Windows PC. Here are the current system diagnostics as JSON:

${JSON.stringify(stats, null, 2)}

Look them over and report anything that needs attention. Be specific: name the process and PID and why it is a problem.

Use your knowledge of what these processes normally are: for each heavy consumer, judge whether its usage is abnormal FOR WHAT THAT PROCESS IS. For example, 2 GB is normal for a game but suspicious for a background updater; a process named like a Windows system process but behaving like a user app is a red flag; a renderer/helper using more than its parent is suspicious. If everything looks healthy, say so. Do not take any action yet.`;
    return strip_markdown(await send_to_pi(message, '--no-tools'));
};

const heal_pi = async (stats) => {
    const message = `You are a self-healing planner for this Windows PC. The computer is freezing and lagging right now. Here are the current system diagnostics as JSON:

${JSON.stringify(stats, null, 2)}

Decide which processes should be terminated to stop the freezing and lagging. Respond ONLY with JSON in exactly this shape, no other text:
{"kill": [{"id": <pid>, "name": "<process name>", "reason": "<why>"}], "notes": "<other advice, if any>"}

Rules:
- Use your knowledge of what each process is: flag and list anything whose usage is abnormal FOR WHAT THAT PROCESS IS (a background app that auto-loaded a huge model, a helper exceeding its parent, a system-named process doing user-app work).
- Only list processes that are ACTIVELY causing the freeze: unresponsive, very high CPU, or very high memory usage.
- ALWAYS include any running process named: ${known_offenders.join(', ')} — these are known auto-loading resource hogs the user wants terminated whenever they appear under load.
- NEVER kill a process just because it is idle, has low activity, is unfamiliar, or is a "potential" hog. When in doubt, leave it out.
- NEVER include these protected process names: ${protected_processes.join(', ')}
- NEVER include PID ${process.pid} (the monitoring server itself).`;
    const raw = await send_to_pi(message, '--no-tools');

    let plan;
    try {
        plan = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    } catch {
        return { error: 'pi did not return a kill plan', raw };
    }

    const offenders = new Set([
        ...(stats.system.unresponsive_processes ?? []).map(p => p.Id),
        ...(stats.cpu.cpu_by_process ?? []).filter(p => p.CPU > offender_cpu_threshold).map(p => p.Id),
        ...(stats.memory.processes ?? []).filter(p => p.private_memory > offender_memory_mb).map(p => p.id),
    ]);
    const pids = [...new Set((plan.kill ?? [])
        .map(k => Number(k.id))
        .filter(id => Number.isInteger(id) && id > 100 && id !== process.pid))];
    const name_of = new Map((stats.memory.processes ?? []).map(p => [p.id, (p.name ?? '').toLowerCase()]));
    const kill_pids = pids.filter(id => offenders.has(id) || known_offenders.includes(name_of.get(id)));
    const rejected = pids.filter(id => !kill_pids.includes(id)).map(id => ({ id, name: name_of.get(id), reason: 'not flagged as an offender by diagnostics' }));

    await writeFile(pid_file, JSON.stringify(kill_pids), 'utf8');
    await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${kill_script}" -PidFile "${pid_file}" -ResultFile "${kill_result_file}" -SafePids "${process.pid}"`);
    const result_text = await readFile(kill_result_file, 'utf8').catch(() => null);
    if (!result_text) {
        const err_text = await readFile(kill_result_file + '.err', 'utf8').catch(() => null);
        await rm(kill_result_file + '.err', { force: true });
        return { plan, error: 'kill script produced no result', detail: err_text?.trim(), pids_attempted: pids };
    }
    await rm(kill_result_file, { force: true });
    const result = JSON.parse(result_text.replace(/^\uFEFF/, '').trim());
    result.skipped = [...(result.skipped ?? []), ...rejected];
    return { plan, result };
};

const pi_ask = async () => await ask_pi(await collect_stats());

const pi_heal = async () => await heal_pi(await collect_stats());

export { pi_ask, pi_heal };

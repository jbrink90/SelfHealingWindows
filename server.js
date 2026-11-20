import express from 'express';
import { get_system_stats, system_stats } from './diagnostics/system.js';
import { get_disk_stats, disk_stats } from './diagnostics/disk.js';
import { get_cpu_stats, cpu_stats } from './diagnostics/cpu.js';
import { get_memory_stats, ram_stats, process_memory } from './diagnostics/memory.js';
import { pi_ask, pi_heal } from './prompt_pi.js';
import { maybe_install_task } from './utils/install_task.js';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('SelfHealingWindows API - Endpoints: /all, /system, /disk, /cpu, /memory, /pi/ask, /pi/heal');
});

app.get('/pi/ask', async (req, res) => {
  const reply = await pi_ask();
  res.type('text/plain').send(reply);
});

app.get('/pi/heal', async (req, res) => {
  const reply = await pi_heal();
  res.type('text/plain').send(reply);
});

app.get('/all', async (req, res) => {
  await get_system_stats();
  await get_disk_stats();
  await get_cpu_stats();
  await get_memory_stats();
  res.send({ system: system_stats, disk: disk_stats, cpu: cpu_stats, memory: { ram: ram_stats, processes: process_memory } });
});

app.get('/system', async (req, res) => {
      await get_system_stats();

  res.send(system_stats);
});


app.get('/disk', async (req, res) => {
      await get_disk_stats();

  res.send(disk_stats);
});


app.get('/cpu', async (req, res) => {
      await get_cpu_stats();

  res.send(cpu_stats);
});


app.get('/memory', async (req, res) => {
      await get_memory_stats();

  res.send({ ram: ram_stats, processes: process_memory });
});


app.listen(port, () => {
  console.log(`server.js listening on port ${port}`);
  maybe_install_task().catch(e => console.log('task prompt failed: ' + e.message));
});
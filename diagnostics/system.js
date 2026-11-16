import os from 'node:os';
import execAsync from '../utils/execAsync.js';

let system_stats = {
    system_name: os.hostname(),
    gpu_utilization: [],
    unresponsive_processes: [],
    system_uptime: ""
};

let get_system_stats = async () => {
    await get_gpu_utilization();
    await get_unresponsive_processes();
    await get_system_uptime();
};

const get_gpu_utilization = async () => {
    // Get-Counter '\GPU Engine(*)\Utilization Percentage'
    // GPU engine workload
    const { stdout } = await execAsync("ConvertTo-Json -Compress -InputObject @((Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples | Where-Object { $_.CookedValue -gt 0 } | Sort-Object CookedValue -Descending | Select-Object InstanceName, CookedValue)", {
    shell: 'powershell.exe'
    });
    const gpu_stats = JSON.parse(stdout);
    console.log("GPU stats found: " + gpu_stats.length);

    system_stats.gpu_utilization = gpu_stats;
};

const get_unresponsive_processes = async () => {
    // Get-Process and Responding
    // Whether GUI processes respond to Windows messages
    // Get-Process | 
    // Where-Object { $_.Responding -eq $false } | 
    // Select-Object Name, Id, MainWindowTitle, Responding | 
    // ConvertTo-Json -Compress
    const { stdout } = await execAsync('ConvertTo-Json -Compress -InputObject @(Get-Process | Where-Object { $_.Responding -eq $false } | Select-Object Name, Id, MainWindowTitle, Responding)', {
    shell: 'powershell.exe'
    });
    const processes = JSON.parse(stdout);
    console.log("Unresponsive processes found: " + processes.length);

    system_stats.unresponsive_processes = processes;
};


const get_system_uptime = async () => {
    const { stdout } = await execAsync("$ts = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; \"{0}d {1}h {2}m {3}s\" -f $ts.Days, $ts.Hours, $ts.Minutes, $ts.Seconds", {
    shell: 'powershell.exe'
    });
    const uptime = stdout.trim();
    console.log("Uptime found: " + uptime);

    system_stats.system_uptime = uptime;
};

export { system_stats, get_system_stats };

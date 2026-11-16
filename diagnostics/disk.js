import execAsync from '../utils/execAsync.js';

let disk_stats = {
    disk_activity: [],
    disk_latency: [],
    disk_queue: []
};

let get_disk_stats = async () => {
    await get_disk_activity();
    await get_disk_latency();
    await get_disk_queue();
};

const get_disk_activity = async () => {
    // Get-Counter '\PhysicalDisk(*)\% Disk Time'
    // Disk busy time
    const { stdout } = await execAsync("ConvertTo-Json -Compress -InputObject @((Get-Counter '\\PhysicalDisk(*)\\% Disk Time').CounterSamples | Sort-Object CookedValue -Descending | Select-Object InstanceName, CookedValue)", {
    shell: 'powershell.exe'
    });
    const disk_activity = JSON.parse(stdout);
    console.log("Disk activity found: " + disk_activity.length);

    disk_stats.disk_activity = disk_activity;
};

const get_disk_latency = async () => {
    // Get-Counter '\PhysicalDisk(*)\Avg. Disk sec/Transfer'
    // Whether storage operations are stalling
    const { stdout } = await execAsync("ConvertTo-Json -Compress -InputObject @((Get-Counter '\\PhysicalDisk(*)\\Avg. Disk sec/Transfer').CounterSamples | Sort-Object CookedValue -Descending | Select-Object InstanceName, CookedValue)", {
    shell: 'powershell.exe'
    });
    const disk_latency = JSON.parse(stdout);
    console.log("Disk latency found: " + disk_latency.length);

    disk_stats.disk_latency = disk_latency;
};

const get_disk_queue = async () => {
    // Get-Counter '\PhysicalDisk(*)\Current Disk Queue Length'
    // Outstanding disk operations
    const { stdout } = await execAsync("ConvertTo-Json -Compress -InputObject @((Get-Counter '\\PhysicalDisk(*)\\Current Disk Queue Length').CounterSamples | Sort-Object CookedValue -Descending | Select-Object InstanceName, CookedValue)", {
    shell: 'powershell.exe'
    });
    const disk_queue = JSON.parse(stdout);
    console.log("Disk queue found: " + disk_queue.length);

    disk_stats.disk_queue = disk_queue;
};

export { disk_stats, get_disk_stats };

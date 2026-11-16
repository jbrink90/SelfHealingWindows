import execAsync from '../utils/execAsync.js';

let ram_stats = {
    total: 0,
    available: 0
};

let process_memory = [];

const get_memory_stats = async () => {
    await get_ram_stats();
    await get_process_memory();
};

const get_ram_stats = async () => {
    // Get-CimInstance Win32_OperatingSystem
    // Total and available physical RAM
    const { stdout } = await execAsync("$os = Get-CimInstance Win32_OperatingSystem; ConvertTo-Json -Compress -InputObject @{ total = [math]::Round($os.TotalVisibleMemorySize / 1KB, 1); available = [math]::Round($os.FreePhysicalMemory / 1KB, 1) }", {
    shell: 'powershell.exe'
    });
    const ram = JSON.parse(stdout);
    console.log("RAM stats found: " + ram.available + " / " + ram.total + " MB available");

    ram_stats.total = ram.total;
    ram_stats.available = ram.available;
};

const get_process_memory = async () => {
    // Get-Process
    // Working set and private memory
    const { stdout } = await execAsync("$cmds = @{}; Get-CimInstance Win32_Process | ForEach-Object { $cmds[[int]$_.ProcessId] = $_.CommandLine }; ConvertTo-Json -Compress -InputObject @(Get-Process | Sort-Object PrivateMemorySize64 -Descending | Select-Object @{ n = 'name'; e = { $_.Name } }, @{ n = 'id'; e = { $_.Id } }, @{ n = 'working_set'; e = { [math]::Round($_.WorkingSet64 / 1MB, 1) } }, @{ n = 'private_memory'; e = { [math]::Round($_.PrivateMemorySize64 / 1MB, 1) } }, @{ n = 'command_line'; e = { if ($_.PrivateMemorySize64 -gt 200MB) { $cmds[[int]$_.Id] } } })", {
    shell: 'powershell.exe'
    });
    const processes = JSON.parse(stdout);
    for (const p of processes) {
        if (typeof p.command_line !== 'string' || !p.command_line) delete p.command_line;
    }
    console.log("Process memory found: " + processes.length);

    process_memory.splice(0, process_memory.length, ...processes);
};

export { ram_stats, process_memory, get_memory_stats };

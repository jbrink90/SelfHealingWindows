import execAsync from '../utils/execAsync.js';

let cpu_stats = {
    cpu_usage: [],
    cpu_by_process: []
};

const get_cpu_stats = async () => {
    await get_cpu_usage();
    await get_cpu_by_process();
};

const get_cpu_usage = async () => {
    // Get-Counter '\Processor(_Total)\% Processor Time'
    // Overall CPU saturation
    const { stdout } = await execAsync("ConvertTo-Json -Compress -InputObject @((Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples | Sort-Object CookedValue -Descending | Select-Object InstanceName, CookedValue)", {
    shell: 'powershell.exe'
    });
    const cpu_usage = JSON.parse(stdout);
    console.log("CPU usage found: " + cpu_usage.length);

    cpu_stats.cpu_usage = cpu_usage;
};

const get_cpu_by_process = async () => {
    // Get-Counter '\Process(*)\% Processor Time'
    // Which processes consume CPU
    const { stdout } = await execAsync("$s = (Get-Counter '\\Process(*)\\% Processor Time', '\\Process(*)\\ID Process').CounterSamples; $ids = @{}; $s | Where-Object { $_.Path -like '*\\id process' } | ForEach-Object { $ids[$_.Path -replace '\\\\id process$', ''] = $_.CookedValue }; ConvertTo-Json -Compress -InputObject @($s | Where-Object { $_.Path -like '*\\% processor time' -and $_.InstanceName -notin '_total', 'idle' -and $_.CookedValue -gt 0 } | Sort-Object CookedValue -Descending | Select-Object @{ n = 'Name'; e = { $_.InstanceName } }, @{ n = 'Id'; e = { $ids[$_.Path -replace '\\\\% processor time$', ''] } }, @{ n = 'CPU'; e = { [math]::Round($_.CookedValue / $env:NUMBER_OF_PROCESSORS, 2) } })", {
    shell: 'powershell.exe'
    });
    const cpu_by_process = JSON.parse(stdout);
    console.log("CPU by process found: " + cpu_by_process.length);

    cpu_stats.cpu_by_process = cpu_by_process;
};

export { cpu_stats, get_cpu_stats };
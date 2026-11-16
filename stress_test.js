import { spawn } from 'node:child_process';

const cpu_workers = Number(process.argv[2] ?? 4);
const mem_hogs = Number(process.argv[3] ?? 2);
const hog_mb = Number(process.argv[4] ?? 4096);

const children = [];
for (let i = 0; i < cpu_workers; i++) {
    const child = spawn('node', ['-e', 'while(true){}']);
    children.push(child);
    console.log(`cpu worker ${i + 1} started, pid: ${child.pid}`);
}

const chunk_mb = 256;
const chunks = Math.max(1, Math.round(hog_mb / chunk_mb));
const hog_code = `const b=[]; for(let i=0;i<${chunks};i++){b.push(Buffer.alloc(${chunk_mb * 1024 * 1024},1))} setInterval(()=>{},60000)`;
for (let i = 0; i < mem_hogs; i++) {
    const child = spawn('node', ['-e', hog_code]);
    children.push(child);
    console.log(`memory hog ${i + 1} started, pid: ${child.pid}, holding ~${hog_mb} MB`);
}

console.log(`total: ${cpu_workers} cpu workers + ${mem_hogs} x ${hog_mb} MB, parent pid: ${process.pid}`);
console.log('ctrl+C to stop');

const stop = () => {
    for (const child of children) child.kill();
    process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60000);

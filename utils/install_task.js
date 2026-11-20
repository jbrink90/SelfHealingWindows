import { execAsync } from './execAsync.js';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const project_root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const task_name = 'SelfHealingWindows';
const choice_file = path.join(project_root, '.task-choice');
const task_cmd = path.join(project_root, 'run-server.cmd');

const is_installed = async () => {
    try {
        await execAsync(`schtasks /query /tn ${task_name}`);
        return true;
    } catch {
        return false;
    }
};

const install_task = async () => {
    try {
        await execAsync(`schtasks /create /tn ${task_name} /tr "${task_cmd}" /sc onlogon /rl highest /f`);
        writeFileSync(choice_file, 'installed');
        console.log('startup task installed: ' + task_name);
        return true;
    } catch (e) {
        console.log('startup task install failed: ' + (e.stderr?.trim() || e.message));
        return false;
    }
};

export { install_task };

export const maybe_install_task = async () => {
    if (existsSync(choice_file)) return;
    if (await is_installed()) {
        writeFileSync(choice_file, 'installed');
        return;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve =>
        rl.question('\nInstall SelfHealingWindows as a startup task (runs at sign-in, elevated)? [y/N] ', resolve)
    );
    rl.close();

    if (answer.trim().toLowerCase() !== 'y') {
        writeFileSync(choice_file, 'declined');
        return;
    }
    await install_task();
};

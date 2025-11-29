import { spawn } from 'child_process';

// ANSI color codes for better visibility
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

// Function to run a command
function runCommand(command, args, label, color) {
    const childProcess = spawn(command, args, {
        shell: true,
        stdio: 'pipe'
    });

    // Prefix for output
    const prefix = `${color}[${label}]${colors.reset}`;

    childProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(`${prefix} ${line}`);
            }
        });
    });

    childProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.error(`${prefix} ${colors.red}${line}${colors.reset}`);
            }
        });
    });

    childProcess.on('close', (code) => {
        if (code !== 0) {
            console.log(`${prefix} ${colors.red}Process exited with code ${code}${colors.reset}`);
        }
    });

    return childProcess;
}

console.log(`${colors.bright}${colors.green}Starting both server and dev...${colors.reset}\n`);

// Run both commands concurrently
const serverProcess = runCommand('npm', ['run', 'server'], 'SERVER', colors.cyan);
const devProcess = runCommand('npm', ['run', 'dev'], 'DEV', colors.yellow);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n${colors.bright}${colors.red}Shutting down...${colors.reset}`);
    serverProcess.kill();
    devProcess.kill();
    process.exit();
});

process.on('SIGTERM', () => {
    serverProcess.kill();
    devProcess.kill();
    process.exit();
});

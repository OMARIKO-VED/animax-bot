const { spawn } = require('child_process');
const path = require('path');

console.log('===========================================================');
console.log('🛡️  Animax Discord Bot 24/7 Watchdog Supervisor Active');
console.log('===========================================================');

let childProcess = null;
let restartCount = 0;
let isShuttingDown = false;

function startBot() {
  if (isShuttingDown) return;

  const scriptPath = path.join(__dirname, 'index.js');
  console.log(`[Watchdog] Launching Animax Bot (attempt #${restartCount + 1})...`);

  childProcess = spawn(process.execPath, [scriptPath], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });

  childProcess.on('exit', (code, signal) => {
    if (isShuttingDown) {
      console.log('[Watchdog] Bot shut down gracefully.');
      return;
    }

    restartCount++;
    console.warn(`[Watchdog] Bot process exited (code: ${code}, signal: ${signal}).`);
    console.warn(`[Watchdog] Auto-restarting in 2 seconds (restarts so far: ${restartCount})...`);

    setTimeout(() => {
      startBot();
    }, 2000);
  });

  childProcess.on('error', (err) => {
    console.error('[Watchdog] Failed to spawn bot process:', err.message);
  });
}

// Graceful shutdown listeners
process.on('SIGINT', () => {
  isShuttingDown = true;
  console.log('\n[Watchdog] Received SIGINT. Shutting down bot...');
  if (childProcess) childProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  isShuttingDown = true;
  console.log('\n[Watchdog] Received SIGTERM. Shutting down bot...');
  if (childProcess) childProcess.kill('SIGTERM');
  process.exit(0);
});

startBot();

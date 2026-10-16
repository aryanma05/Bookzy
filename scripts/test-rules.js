// Tester firestore.rules mot Firestore-emulatoren. Kjør med: npm run test:rules
const { spawnSync } = require('node:child_process');

const result = spawnSync(
  'firebase emulators:exec --only firestore --project demo-bookzy "node --test tests/*.test.mjs"',
  { stdio: 'inherit', shell: true }
);

// På Windows lar firebase-tools Firestore-emulatoren (java) bli hengende etter emulators:exec,
// slik at neste kjøring får «port taken». Stopp bare test-emulatoren (demo-bookzy).
if (process.platform === 'win32') {
  spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" | " +
        "Where-Object { $_.CommandLine -like '*cloud-firestore-emulator*demo-bookzy*' } | " +
        'ForEach-Object { Stop-Process -Id $_.ProcessId -Force }',
    ],
    { stdio: 'inherit' }
  );
}

process.exit(result.status ?? 1);

import { existsSync, mkdirSync, rmSync, copyFileSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const apps = ['structsolve', 'rootfinder', 'condnumber', 'funcapprox'];

function run(command, args, cwd = root) {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/d', '/s', '/c', command, ...args], { cwd, stdio: 'inherit' });
    return;
  }
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function copyRequiredFile(name) {
  copyFileSync(join(root, name), join(root, 'dist', name));
}

function copyRequiredDir(name) {
  cpSync(join(root, name), join(root, 'dist', name), { recursive: true });
}

for (const app of apps) {
  console.log(`==> Building ${app} Vite app...`);
  const appDir = join(root, app);
  run(npm, ['install'], appDir);
  run(npm, ['run', 'build'], appDir);

  const indexPath = join(appDir, 'dist', 'index.html');
  if (!existsSync(indexPath) || !readFileSync(indexPath, 'utf8').includes('assets/')) {
    throw new Error(`${app}/dist/index.html missing or not built correctly`);
  }
}

console.log('==> Assembling output directory...');
rmSync(join(root, 'dist'), { recursive: true, force: true });
mkdirSync(join(root, 'dist'), { recursive: true });

for (const file of ['index.html', 'contact.html', 'contribution.html', 'logo.svg']) {
  copyRequiredFile(file);
}

for (const dir of ['hydro', 'numerics', 'contributors', 'steel']) {
  copyRequiredDir(dir);
}

for (const app of apps) {
  cpSync(join(root, app, 'dist'), join(root, 'dist', app), { recursive: true });
}

console.log('==> Build complete. Contents of dist/:');
console.log(readdirSync(join(root, 'dist')).sort().join('\n'));

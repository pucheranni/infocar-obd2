import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'www');

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Arquivos e pastas do frontend
const targets = ['index.html', 'manifest.json', 'icon.svg', 'css', 'js'];
for (const t of targets) {
  const src = path.join(root, t);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(dist, t));
  }
}

// Copia também para android/app/src/main/assets/public se existir
const androidAssets = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(androidAssets)) {
  for (const t of targets) {
    const src = path.join(root, t);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(androidAssets, t));
    }
  }
  console.log('Assets sincronizados com sucesso em android/app/src/main/assets/public!');
}

console.log('Build web para www/ concluído com sucesso!');

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publishDir = path.join(root, 'public');
const files = ['index.html', 'styles.css', 'api.js', 'app.js', 'appointment-domain.js'];
const directories = ['assets', 'snaptext-tools'];

fs.rmSync(publishDir, { recursive: true, force: true });
fs.mkdirSync(publishDir, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) throw new Error(`Required frontend file is missing: ${file}`);
  fs.copyFileSync(source, path.join(publishDir, file));
}

for (const directory of directories) {
  const source = path.join(root, directory);
  if (!fs.existsSync(source)) throw new Error(`Required frontend directory is missing: ${directory}`);
  fs.cpSync(source, path.join(publishDir, directory), { recursive: true });
}

console.log('Netlify static site prepared in /public.');

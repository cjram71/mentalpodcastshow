const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

const filesAndDirectories = [
  'index.html',
  'show.html',
  'about.html',
  'editorial-standards.html',
  'submit.html',
  'help.html',
  'privacy.html',
  '404.html',
  'styles.css',
  'app.js',
  'show.js',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'CNAME',
  '.nojekyll',
  'assets',
  'data'
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const item of filesAndDirectories) {
  const source = path.join(root, item);
  const destination = path.join(output, item);

  if (!fs.existsSync(source)) {
    console.warn(`Skipping missing path: ${item}`);
    continue;
  }

  fs.cpSync(source, destination, { recursive: true });
}

console.log(`Static site built successfully in ${output}`);

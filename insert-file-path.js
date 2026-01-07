// fix-relative-imports.js
import fs from 'fs';
import path from 'path';

const projectRoot = '/Users/viravira/Documents/starway-studio/packages/frontend/src';
const uiDir = path.join(projectRoot, 'ui');
const libDir = path.join(projectRoot, 'lib');

function getRelativeImport(fromFile, targetDir) {
  let rel = path.relative(path.dirname(fromFile), targetDir);
  rel = rel.replace(/\\/g, '/'); // для Windows
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const lines = content.split('\n');

  const newLines = lines.map((line) => {
    let match = line.match(/import\s+{?\s*([\w, ]+)\s*}?\s+from\s+['"]@\/ui['"]/);
    if (match) {
      const relPath = getRelativeImport(filePath, uiDir);
      const comment = `// ${filePath}`;
      return comment + '\n' + line.replace('@\/ui', relPath);
    }

    match = line.match(/import\s+{?\s*([\w, ]+)\s*}?\s+from\s+['"]@\/lib['"]/);
    if (match) {
      const relPath = getRelativeImport(filePath, libDir);
      const comment = `// ${filePath}`;
      return comment + '\n' + line.replace('@\/lib', relPath);
    }

    return line;
  });

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  console.log('processed:', filePath);
}

function traverseDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) traverseDir(fullPath);
    else if (fullPath.endsWith('.tsx', 'ts')) processFile(fullPath);
  }
}

traverseDir(projectRoot);
console.log('Done fixing imports!');

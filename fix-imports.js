// fix-imports.js
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

function fixImports(filePath) {
  if (!/\.(ts|tsx)$/.test(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Визначаємо глибину
  const relativePath = filePath.replace('packages/shared/src/', '');
  const depth = (relativePath.match(/\//g) || []).length;
  
  let prefix = './';
  if (depth === 1) prefix = '../';
  if (depth === 2) prefix = '../../';
  if (depth >= 3) prefix = '../../../';
  
  // Замінюємо
  content = content.replace(/@starway-studio\/shared\/components\//g, `${prefix}components/`);
  content = content.replace(/@starway-studio\/shared\/utils\//g, `${prefix}utils/`);
  content = content.replace(/@starway-studio\/shared\/types\//g, `${prefix}types/`);
  content = content.replace(/@starway-studio\/shared\/schemas\//g, `${prefix}schemas/`);
  content = content.replace(/@starway-studio\/shared\/services\//g, `${prefix}services/`);
  content = content.replace(/@starway-studio\/shared\/hooks\//g, `${prefix}hooks/`);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

console.log('🔧 Fixing imports...');
walkDir('packages/shared/src', fixImports);
console.log('✨ Done!');
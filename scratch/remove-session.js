const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'app', 'api');

function walkDir(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      files = files.concat(walkDir(filePath));
    } else {
      files.push(filePath);
    }
  });
  return files;
}

const files = walkDir(apiDir);
let replacedCount = 0;

files.forEach(file => {
  if (!file.endsWith('.ts') && !file.endsWith('.js')) return;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // General multiline pattern that matches x-session-id retrieval followed by the !sessionId check and its multiline return
  const multilineBlock = /const\s+sessionId\s*=\s*request\.headers\.get\(['"]x-session-id['"]\)\s*\r?\n\s*if\s*\(!sessionId\)\s*\{\s*\r?\n\s*return\s+NextResponse\.json\([\s\S]*?\)\s*\r?\n\s*\}/g;

  content = content.replace(multilineBlock, 'const sessionId = "default-workspace-session"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${path.relative(apiDir, file)}`);
    replacedCount++;
  }
});

console.log(`Successfully updated ${replacedCount} API routes.`);

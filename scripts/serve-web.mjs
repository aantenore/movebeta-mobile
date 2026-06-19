import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 8082);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const normalized = normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(root, normalized);

  if (candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  return join(root, 'index.html');
}

createServer((request, response) => {
  const filePath = resolveFile(request.url ?? '/');
  const extension = extname(filePath);
  response.setHeader('Content-Type', contentTypes[extension] ?? 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Preview server listening on http://localhost:${port}`);
});

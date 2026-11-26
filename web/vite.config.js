import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));

// Copies .env and then .env.local (which wins) into process.env, for the server code in api/.
// Done here, at the top, so a key saved while Vite runs works after Vite restarts by itself.
// These are NOT the VITE_ variables: nothing here goes into the browser bundle.
for (const file of ['.env', '.env.local']) {
  try {
    Object.assign(process.env, parseEnv(readFileSync(root + file, 'utf8')));
  } catch {
    // the file is missing: nothing to copy
  }
}

// Plain Vite does not run serverless functions. On the laptop this sends /api/<name> to api/<name>.js
// (the same file Vercel runs in production): it builds a web Request, calls the file's exported
// handler for that method (POST …), and sends its Response back.
function apiRoutes() {
  return {
    name: 'api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z0-9-]+)\/?(?:\?|$)/i.exec(req.url ?? '');
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`);
          const handler = mod[req.method];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            return res.end();
          }
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          // The rate limit counts per IP and reads X-Real-IP (api/ai.js clientIp). Like Vercel, set it here
          // from the socket, so a caller can never choose it.
          headers.set('x-real-ip', req.socket.remoteAddress ?? 'unknown');
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error('[api] Route failed:', err);
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}

// open: true -> the browser opens by itself after `npm run dev`.
export default defineConfig({
  plugins: [react(), apiRoutes()],
  server: { open: true },
});

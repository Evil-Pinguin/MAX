import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { forwardToGreenApi, isAllowedHost } from './server/greenApiProxy';

// Запросы из браузера идут на относительный путь /green-api/...
// Этот плагин пересылает их на адрес конкретного инстанса (заголовок X-Green-Api-Host).
// Так браузер не упирается в CORS, а сервер не становится открытым прокси.
function greenApiProxy(): Plugin {
  const middleware = async (req: any, res: any, next: () => void) => {
    if (!req.url?.startsWith('/green-api/')) return next();
    try {
      const host = req.headers['x-green-api-host'];
      if (!isAllowedHost(host)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Некорректный адрес инстанса' }));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const result = await forwardToGreenApi({
        method: req.method,
        host,
        path: req.url.replace(/^\/green-api/, ''),
        contentType: req.headers['content-type'],
        body: Buffer.concat(chunks),
      });
      res.statusCode = result.status;
      if (result.contentType) res.setHeader('Content-Type', result.contentType);
      res.end(Buffer.from(result.body));
    } catch (e) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: e instanceof Error ? e.message : 'Прокси недоступен' }));
    }
  };
  return {
    name: 'green-api-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), greenApiProxy()],
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
});

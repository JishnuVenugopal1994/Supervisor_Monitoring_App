import http from 'http';
import 'dotenv/config';
import { app } from './app';
import { initSocket } from './socket';

// Validate required environment variables before starting
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ORIGIN'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Fatal: missing required environment variable "${key}"`);
    process.exit(1);
  }
}

const PORT = process.env.PORT ?? 4000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { logger } from './lib/logger.js';
import { registerSocketHandlers } from './socket.js';

const rawPort = process.env['PORT'];

if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  /* Replit path-based proxy: /api-server prefix */
  path: '/api-server/socket.io',
  transports: ['websocket', 'polling'],
});

registerSocketHandlers(io);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, 'Error listening on port');
    process.exit(1);
  }
  logger.info({ port }, 'Server listening (HTTP + Socket.IO)');
});

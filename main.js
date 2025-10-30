const WebSocket = require('ws');

const port = process.env.PORT || 80;
const wss = new WebSocket.Server({ port });

function normalizeIP(ip) {
  if (!ip) return ip;
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  return ip;
}

wss.on('connection', (ws, request) => {
  let clientIP = request.headers['x-forwarded-for']?.split(',')[0].trim();
  if (!clientIP) clientIP = normalizeIP(ws._socket.remoteAddress);

  console.log(`Client connected from IP ${clientIP}`);

  ws.on('message', (msg) => {
    console.log(`Got ${msg} from IP ${clientIP}`);
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
});

console.log(`WebSocket relay running on port ${port}`);

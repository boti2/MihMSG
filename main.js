const WebSocket = require('ws');

const port = process.env.PORT || 80;
const wss = new WebSocket.Server({ port });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
});

console.log(`WebSocket relay running on port ${port}`);

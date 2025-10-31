const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 80;

app.get("/^.*$/", (req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>404 Not Found</title>
      <style>
        body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          font-family: Arial, sans-serif;
          background-color: #f9f9f9;
        }
        h1 {
          font-size: 10rem;
          color: red;
          margin: 0;
        }
        p {
          font-size: 2rem;
          color: #333;
          margin: 10px 0 0 0;
        }
      </style>
    </head>
    <body>
      <h1>404</h1>
      <p>This page is nowhere to be found...</p>
    </body>
    </html>
  `);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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


app.listen(port, () => {
  console.log(`WebSocket relay running on port ${port}`);
});

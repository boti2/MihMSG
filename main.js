const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const uuid = require('uuid');
const { Sender } = require('ws');

const app = express();

app.use(express.urlencoded({ extended: true }));

app.post(/^\/(index\.html)?$/, (req, res) => {
  const host = req.get('host');
  res.send(fs.readFileSync('site/index.html', 'utf8')
     .replace('<-- INSERT GENERATED SCRIPT HERE -->',
      `<script>var initobj={server:"wss://${host}",name:"${req.body.name}",token:"${req.body.token}"};</script>`
    ));
});

app.use(express.static('site/served', { fallthrough: true }));

app.get(/^.*$/, (req, res) => {
  res.status(404).send(fs.readFileSync('site/404.html', 'utf8'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function normalizeIP(ip) {
  if (!ip) return ip;
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  return ip;
}

let tokens = new Set();
let stoken = uuid.v4();
tokens.add(stoken);

console.log(`Start Server Token is ${stoken}`);

function genToken(){
  const token = uuid.v4();
  tokens.add(token);
  setTimeout(() => {
  tokens.delete(token);
  }, 120000);
  return token;
}

wss.on('connection', (ws, request) => {
  let clientIP = request.headers['x-forwarded-for']?.split(',')[0].trim();
  if (!clientIP) clientIP = normalizeIP(ws._socket.remoteAddress);

  console.log(`Client connected from IP ${clientIP}`);

  ws.WasAuthorised = false;
  ws.clientIP = clientIP;

  ws.on('message', (msg) => {
    try {
    data = JSON.parse(msg.toString());
      if (data.type === 'auth'){
        if (tokens.has(data.token)){
          ws.WasAuthorised = true;
          ws.send(JSON.stringify({type: "auth"}));
          console.log(`User '${data.user}' connected from IP ${ws.clientIP}`);
          genToken();

          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) client.send(JSON.stringify({type: 'ann', text: `${data.user} joined`}));
          });
        } else {
          ws.close(1008, 'Invalid Token');
          console.log(`User '${data.name}' tried to connect from IP ${ws.clientIP} with invalid token ${data.token}`);
        }
      } else if (data.type === 'msg'){
        if (ws.WasAuthorised){
          console.log(`Got authorised message from IP ${ws.clientIP}`);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) client.send(msg);
          });
        } else console.log(`Ignoring unauthorised message '${msg}' from IP ${ws.clientIP}`);
      } else if (data.type === 'cmd'){
        if (data.text === 'invite'){
          let token = genToken();
          ws.send(JSON.stringify({type: 'ann', text: `Generated invite token: ${token}`}));
        } else ws.send(JSON.stringify({type: 'ann', text: `Invalid command '${data.text}'`}));
      } else console.log(`Ignoring invalid Message ${msg} from IP ${clientIP}`);
    } catch (x){
      console.log(`Ignoring invalid Message ${msg} from IP ${clientIP}`);
    }
  });
});


const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

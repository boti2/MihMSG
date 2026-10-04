const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const uuid = require('uuid');


function getMode(modes, defaultMode){
  const mode = process.env['MihMSG-Mode'] ?? defaultMode;

  if (mode === null || mode === undefined){
    console.log('Error: no mode specified');
    console.log('To specify a mode, set environment variable MihMSG-Mode');
    process.exit(1);
  }
  if (!modes.includes(mode)){
    console.log(`Error: invalid mode: '${mode}'`);
    process.exit(1);
  }

  return mode;
}

const mode = getMode(['dev', 'production'], 'dev');


const app = express();

app.use(express.urlencoded({ extended: true }));

app.post(/^\/(index\.html)?$/, (req, res) => {
  const host = req.get('host');
  res.send(fs.readFileSync('site/app.html', 'utf8')
     .replace('<-- INSERT GENERATED SCRIPT HERE -->',
      `<script>var initobj={server:"${mode == 'production' ? 'wss' : 'ws'}://${host}",name:"${req.body.name}",token:"${req.body.token}"};window.history.replaceState({},'','');</script>`
    ));
});

app.use(express.static('site/public', { fallthrough: true }));

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

function logIP(ws){
  return mode === 'production' ? '' : ` from IP ${ws.clientIP}`;
}

wss.on('connection', (ws, request) => {
  let clientIP = request.headers['x-forwarded-for']?.split(',')[0].trim();
  if (!clientIP) clientIP = normalizeIP(ws._socket.remoteAddress);

  console.log(`Client connected from IP ${clientIP}`);

  ws.WasAuthorised = false;
  ws.clientIP = clientIP;

  ws.on('message', (msg) => {
    try {
    const data = JSON.parse(msg.toString());
      if (data.type === 'auth'){
        if (tokens.has(data.token)){
          ws.WasAuthorised = true;
          ws.send(JSON.stringify({type: "auth"}));
          console.log(`User '${data.user}' connected` + logIP(ws));
          genToken();
          tokens.delete(data.token);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) client.send(JSON.stringify({type: 'ann', text: `${data.user} joined`}));
          });
        } else {
          ws.close(1008, 'Invalid Token');
          console.log(`User '${data.name}' tried to connect${logIP(ws)} with invalid token ${data.token}`);
        }
      } else if (ws.WasAuthorised){
        if (data.type === 'msg'){
          if (mode !== 'production'){
            console.log(`Recieved message from IP ${ws.clientIP}`);
          }
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) client.send(msg);
          });
        } else if (data.type === 'cmd'){
          if (data.text === 'invite'){
            let token = genToken();
            ws.send(JSON.stringify({type: 'ann', text: `Generated invite token: ${token}`}));
          } else ws.send(JSON.stringify({type: 'ann', text: `Invalid command '${data.text}'`}));
        }
      } else {
        console.log(`Ignoring invalid/unauthorised Message ${msg}` + logIP(ws));
      }
    } catch (x){
      ws.close(1008, 'Unauthorized Message');
      console.log(`Ignoring invalid Message ${msg}` + logIP(ws));
    }
  });
});


const port = mode == 'production' ? process.env.PORT : 8080;
if (port == '' || !Number.isInteger(Number(port))){
  console.log(`Error: invalid port: '${port}'`)
  process.exit(1);
}

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

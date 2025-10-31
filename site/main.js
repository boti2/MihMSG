const inputBox = document.getElementById('inputBox');
const sendBtn = document.getElementById('sendBtn');
const scrollArea = document.getElementById('scrollArea');
lastUser = '$$$none';
lastDate = '$$$none';
lastMsl = null;
lastMcl = null;

var ip = new URLSearchParams(window.location.search).get('server');
const ws = new WebSocket('wss://' + ip);

function sendMessage(text){
  if (!text.trim()) return;

  const dateStr = new Date().toLocaleString('default', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

  const messageData = {
    content: text,
    user: new URLSearchParams(window.location.search).get('user'),
    date: dateStr
  };

  ws.send(JSON.stringify(messageData));
  
  const content = document.createElement('div');
  content.className = 'mtext';
  content.textContent = text;

  addMessage(content, "Eu", dateStr);
}

function addMessage(content, userStr, dateStr){
  if (lastUser !== userStr){
    scrollArea.appendChild(document.createElement('hr'));
    
    const msg = document.createElement('div');
    msg.className = 'message';

    const cname = document.createElement('div');
    cname.className = 'vcenter';

    const tname = document.createElement('div');
    tname.className = 'mname';
    tname.textContent = userStr;

    const blockList = document.createElement('div');
    blockList.className = 'vlist mblist';

    const contentBox = document.createElement('div');
    contentBox.className = 'hlist mcbox';

    const contentList = document.createElement('div');
    contentList.className = 'vlist mmlist';

    const cdate = document.createElement('div');
    cdate.className = 'vcenter';

    const tdate = document.createElement('div');
    tdate.className = 'mdate';
    tdate.textContent = new Date().toLocaleString('default', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

    cname.appendChild(tname);
    contentList.appendChild(content);
    cdate.appendChild(tdate);
    contentBox.appendChild(contentList);
    contentBox.appendChild(cdate);
    blockList.append(contentBox);
    msg.appendChild(cname);
    msg.appendChild(blockList);

    scrollArea.appendChild(msg);

    lastUser = userStr;
    lastMsl = blockList;
    lastMcl = contentList;
    lastDate = dateStr;
  } else if (lastDate !== dateStr){
    const contentBox = document.createElement('div');
    contentBox.className = 'hlist mcbox';

    const contentList = document.createElement('div');
    contentList.className = 'vlist mmlist';

    const cdate = document.createElement('div');
    cdate.className = 'vcenter';

    const tdate = document.createElement('div');
    tdate.className = 'mdate';
    tdate.textContent = new Date().toLocaleString('default', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

    contentList.appendChild(content);
    cdate.appendChild(tdate);
    contentBox.appendChild(contentList);
    contentBox.appendChild(cdate);
    lastMsl.appendChild(contentBox);
    
    lastMcl = contentList;
    lastDate = dateStr;
  } else lastMcl.appendChild(content);

  scrollArea.scrollTop = scrollArea.scrollHeight;
}

inputBox.addEventListener('keydown', function(e){
  if (e.key === 'Enter'){
    sendMessage(inputBox.value);
    inputBox.value = '';
  }
});

sendBtn.addEventListener('click', function(){
  sendMessage(inputBox.value);
  inputBox.value = '';
});

pingTimerID = null;

ws.onopen = () => {
  console.log('Connected to WebSocket server');
  pingTimerID = setInterval(() => {
    const timestamp = new Date().toISOString();
    ws.send(JSON.stringify({type: "ping"}));
  }, 1000);
};

ws.onmessage = async (event) => {
  let json;
  if (event.data instanceof Blob) json = await event.data.text();
  else json = event.data;

  const message = JSON.parse(json);
  const content = document.createElement('div');
  content.className = 'mtext';
  content.textContent = message.content;
  addMessage(content, message.user, message.date);
};

ws.onerror = (error) => {
  alert('WebSocket connection failed. Please check the server address and try again.');
  console.error('WebSocket error: ', error);
};

ws.onclose = (event) => {
  if (pingTimerID !== null){
    clearInterval(pingTimerID);
    pingTimerID = null;
  }
  
  if (!event.wasClean) {
    alert(`Disconnected from WebSocket server (code: ${event.code})`);
  }

  console.log('WebSocket closed', event);
};

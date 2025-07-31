// === STATE ===
let chatSessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
let currentSessionId = localStorage.getItem('currentSessionId');

// Jika tidak ada sesi, buat baru
if (chatSessions.length === 0) {
  const firstId = 'session_' + Date.now();
  chatSessions.push({
    id: firstId,
    name: 'Chat Baru',
    createdAt: new Date().toISOString(),
    messages: []
  });
  currentSessionId = firstId;
  localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
}

if (!currentSessionId) {
  currentSessionId = chatSessions[0].id;
}

// === DOM Elements ===
const chatSessionsEl = document.getElementById('chatSessions');
const chatEl = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const newChatBtn = document.getElementById('newChatBtn');

// === Load UI ===
function renderSessions() {
  chatSessionsEl.innerHTML = '';
  chatSessions.forEach(session => {
    const div = document.createElement('div');
    div.className = `session-item ${session.id === currentSessionId ? 'active' : ''}`;
    div.innerHTML = `
      ${session.name}
      <span class="delete-session" onclick="deleteSession(event, '${session.id}')">×</span>
    `;
    div.onclick = (e) => {
      if (!e.target.classList.contains('delete-session')) {
        switchSession(session.id);
      }
    };
    chatSessionsEl.appendChild(div);
  });
}

function loadCurrentSession() {
  const session = chatSessions.find(s => s.id === currentSessionId);
  if (!session) return;
  chatEl.innerHTML = '';
  session.messages.forEach(msg => {
    appendMessage(msg.text, msg.sender);
  });
  chatEl.scrollTop = chatEl.scrollHeight;
}

// === Append Message ===
function appendMessage(html, sender) {
  const el = document.createElement('div');
  el.classList.add('message', sender);
  el.innerHTML = html;
  Prism.highlightAllUnder(el);
  chatEl.appendChild(el);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// === Switch Session ===
function switchSession(id) {
  const session = chatSessions.find(s => s.id === id);
  if (!session) return;
  currentSessionId = id;
  localStorage.setItem('currentSessionId', id);
  loadCurrentSession();
  renderSessions();
}

// === New Session ===
newChatBtn.addEventListener('click', () => {
  const id = 'session_' + Date.now();
  const name = `Chat Baru ${chatSessions.length + 1}`;
  chatSessions.push({
    id,
    name,
    createdAt: new Date().toISOString(),
    messages: []
  });
  currentSessionId = id;
  localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
  localStorage.setItem('currentSessionId', id);
  renderSessions();
  chatEl.innerHTML = '';
});

// === Delete Session ===
function deleteSession(e, id) {
  e.stopPropagation();
  if (chatSessions.length === 1) {
    alert('Minimal satu sesi harus ada.');
    return;
  }
  if (confirm('Hapus sesi ini?')) {
    chatSessions = chatSessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
      currentSessionId = chatSessions[0].id;
      localStorage.setItem('currentSessionId', currentSessionId);
    }
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    renderSessions();
    loadCurrentSession();
  }
}

// === Send Message ===
async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  const session = chatSessions.find(s => s.id === currentSessionId);
  if (!session) return;

  appendMessage(msg, 'user');
  session.messages.push({ text: msg, sender: 'user' });

  userInput.value = '';

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, model: getSelectedModel() })
    });
    const data = await res.json();
    const reply = data.reply || 'Tidak ada respons.';
    appendMessage(reply, 'ai');
    session.messages.push({ text: reply, sender: 'ai' });
  } catch (err) {
    const errorMsg = 'Gagal terhubung ke Ollama.';
    appendMessage(errorMsg, 'ai');
    session.messages.push({ text: errorMsg, sender: 'ai' });
  } finally {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
  }
}

// === Helper: Dapatkan model dari dropdown
function getSelectedModel() {
  const select = document.getElementById('modelSelect');
  return select ? select.value : 'phi3:3.8b-mini-q4_0';
}

// === Quick Actions (tetap sama)
async function requestAutocomplete() {
  const code = userInput.value.trim();
  if (!code) return;
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Lanjutkan:\n\n${code}`, model: getSelectedModel() })
  });
  const data = await res.json();
  const sug = data.reply || '';
  const suggestionEl = document.getElementById('suggestion');
  suggestionEl.textContent = sug;
  suggestionEl.style.display = 'block';
  suggestionEl.onclick = () => { userInput.value += ' ' + sug; suggestionEl.style.display = 'none'; };
}

function runCode() {
  let code = userInput.value.trim();
  if (!/console\.log|return/.test(code)) code = 'console.log(' + code + ')';
  try {
    const logs = [];
    const log = (...args) => logs.push(args.map(String).join(' '));
    new Function('console', code)({ log });
    appendMessage(`✅ Output:\n\`\`\`\n${logs.join('\n')}\n\`\`\``, 'ai');
  } catch (err) {
    appendMessage(`❌ Error:\n\`\`\`\n${err.message}\n\`\`\``, 'ai');
  }
}

async function debugError() {
  const err = userInput.value.trim();
  if (!err) return;
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Debug error:\n\n${err}`, model: getSelectedModel() })
  });
  const data = await res.json();
  appendMessage(`🐞 Analisis:\n\n${data.reply || '...'}`, 'ai');
}

// === Theme Toggle ===
const themeToggle = document.getElementById('themeToggle');
themeToggle.textContent = localStorage.getItem('theme') === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
});

// === Init ===
renderSessions();
loadCurrentSession();
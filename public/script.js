const chat = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const themeToggle = document.getElementById('themeToggle');
const clearChatBtn = document.getElementById('clearChat');
const exportChatBtn = document.getElementById('exportChat');
const exportFormat = document.getElementById('exportFormat');
const suggestionEl = document.getElementById('suggestion');

let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let selectedModel = localStorage.getItem('ollama-model') || 'phi3:3.8b-mini-q4_0';

// Theme
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
themeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

// Load model
document.getElementById('modelSelect').value = selectedModel;

function loadChat() {
  chat.innerHTML = '';
  chatHistory.forEach(msg => appendMessage(msg.text, msg.sender));
  chat.scrollTop = chat.scrollHeight;
}

function appendMessage(html, sender) {
  const el = document.createElement('div');
  el.classList.add('message', sender);
  el.innerHTML = html;
  Prism.highlightAllUnder(el);
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

themeToggle.addEventListener('click', () => {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  themeToggle.textContent = t === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
});

clearChatBtn.addEventListener('click', () => {
  if (confirm('Hapus semua riwayat?')) {
    chatHistory = [];
    localStorage.removeItem('chatHistory');
    loadChat();
  }
});

exportChatBtn.addEventListener('click', () => {
  const f = exportFormat.value;
  const n = 'chat_' + new Date().toISOString().slice(0,16).replace('T','_') + '.' + f;
  let c = f === 'md' ? '# chatGenZ\n> ' + new Date().toLocaleString() + '\n\n' : 'chatGenZ\n' + new Date().toLocaleString() + '\n\n';
  chatHistory.forEach(m => c += (m.sender==='user'?'You':'AI') + ':\n\n' + m.text.replace(/<[^>]*>/g, '') + '\n\n');
  const b = new Blob([c], {type:'text/plain'});
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u; a.download = n; a.click(); URL.revokeObjectURL(u);
});

async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  appendMessage(msg, 'user');
  chatHistory.push({ text: msg, sender: 'user' });

  userInput.value = '';
  suggestionEl.style.display = 'none';

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, model: selectedModel })
    });
    const data = await res.json();
    const reply = data.reply || 'Tidak ada respons.';
    appendMessage(reply, 'ai');
    chatHistory.push({ text: reply, sender: 'ai' });
  } catch (err) {
    appendMessage('Gagal terhubung ke Ollama.', 'ai');
  } finally {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }
}

userInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());

document.getElementById('modelSelect').addEventListener('change', e => {
  selectedModel = e.target.value;
  localStorage.setItem('ollama-model', selectedModel);
  appendMessage(`✅ Model: **${selectedModel}**`, 'ai');
});

async function requestAutocomplete() {
  const code = userInput.value.trim();
  if (!code) return;
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Lanjutkan:\n\n${code}`, model: selectedModel })
  });
  const data = await res.json();
  const sug = data.reply || '';
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
    body: JSON.stringify({ message: `Debug error:\n\n${err}`, model: selectedModel })
  });
  const data = await res.json();
  appendMessage(`🐞 Analisis:\n\n${data.reply || '...'}`, 'ai');
}

loadChat();

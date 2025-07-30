const chat = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const themeToggle = document.getElementById('themeToggle');
const clearChatBtn = document.getElementById('clearChat');
const exportChatBtn = document.getElementById('exportChat');
const exportFormat = document.getElementById('exportFormat');
const importChatBtn = document.getElementById('importChat');
const fileInputImport = document.getElementById('fileInputImport');
const attachFileBtn = document.getElementById('attachFile');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('file-preview');
const suggestionEl = document.getElementById('suggestion');

let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let attachedFile = null;
let selectedModel = localStorage.getItem('ollama-model') || 'phi3:mini';

// Theme
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
themeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

// Model
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

importChatBtn.addEventListener('click', () => fileInputImport.click());
fileInputImport.addEventListener('change', function(e) {
  const r = new FileReader();
  r.onload = function(ev) {
    const lines = ev.target.result.split('\n');
    const imp = [];
    let s = null, m = '';
    lines.forEach(l => {
      if (l.startsWith('You:') || l.startsWith('**You**:')) {
        if (s) imp.push({sender:s, text:m.trim()});
        s = 'user'; m = l.replace(/^(?:\*\*You\*\*:|You:)\s*/, '');
      } else if (l.startsWith('AI:') || l.startsWith('**AI**:')) {
        if (s) imp.push({sender:s, text:m.trim()});
        s = 'ai'; m = l.replace(/^(?:\*\*AI\*\*:|AI:)\s*/, '');
      } else if (s) m += '\n' + l;
    });
    if (s) imp.push({sender:s, text:m.trim()});
    if (imp.length && confirm(`Impor ${imp.length} pesan?`)) {
      chatHistory = [...imp, ...chatHistory];
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
      loadChat();
    }
  };
  r.readAsText(e.target.files[0]);
});

attachFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f || f.size > 5e6) return alert('File >5MB!');
  attachedFile = f;
  filePreview.innerHTML = `<small>📎 ${f.name} (${(f.size/1024).toFixed(1)} KB) <span onclick="removeAttachment()" style="color:#e74c3c;cursor:pointer">✖️</span></small>`;
  userInput.placeholder = 'Pesan (file dilampirkan)';
});

function removeAttachment() {
  attachedFile = null;
  filePreview.innerHTML = '';
  userInput.placeholder = 'Tanya sesuatu tentang kode...';
  fileInput.value = '';
}

async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg && !attachedFile) return;

  let fullMsg = msg;
  if (attachedFile) {
    fullMsg += `\n\n📄 Isi file ${attachedFile.name}:\n\`\`\`\n${await attachedFile.text()}\n\`\`\``;
  }

  appendMessage(attachedFile ? `<strong>📎 ${attachedFile.name}</strong><br>${msg}` : msg, 'user');
  chatHistory.push({ text: msg, sender: 'user' });

  userInput.value = '';
  removeAttachment();
  suggestionEl.style.display = 'none';

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fullMsg, model: selectedModel })
    });
    const data = await res.json();
    appendMessage(data.reply || 'No reply.', 'ai');
    chatHistory.push({ text: data.reply || 'No reply.', sender: 'ai' });
  } catch (err) {
    appendMessage('Gagal ke Ollama.', 'ai');
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
  const m = code.match(/```(?:js|javascript)?\s*([\s\S]*?)```/);
  if (m) code = m[1];
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

async function refactorCode() {
  await sendPrompt(`Refactor kode berikut:\n\n${userInput.value}`, '♻️ Hasil Refactor:');
}

async function debugError() {
  await sendPrompt(`Debug error:\n\n${userInput.value}`, '🐞 Analisis Error:');
}

async function sendPrompt(prompt, prefix) {
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, model: selectedModel })
    });
    const data = await res.json();
    appendMessage(`${prefix}\n\n${data.reply || '...'}`, 'ai');
  } catch (err) {
    appendMessage('Error.', 'ai');
  }
}

loadChat();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

app.post('/chat', (req, res) => {
  const { message, model = 'phi3:3.8b-mini-q4_0' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  console.log(`[Model] ${model} | Prompt: ${message.substring(0, 50)}...`);

  const ollama = spawn('ollama', ['run', model]);
  let response = '';
  let timeout = false;

  const timer = setTimeout(() => {
    ollama.kill();
    timeout = true;
    res.json({
      reply: "⏳ Respons terlalu lama. Pastikan Ollama berjalan dan model sudah diunduh."
    });
  }, 60000);

  ollama.stdin.write(message + '\n');
  ollama.stdin.end();

  ollama.stdout.on('data', data => { if (!timeout) response += data.toString(); });
  ollama.stderr.on('data', data => { if (!timeout) console.error(data); });

  ollama.on('close', (code) => {
    clearTimeout(timer);
    if (timeout) return;
    if (code !== 0) return res.status(500).json({ error: 'Ollama exited with code ' + code });
    res.json({ reply: response.trim() });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`💬 chatGenZ siap di http://localhost:${PORT}`);
  console.log(`💡 Gunakan model: phi3:3.8b-mini-q4_0 (ringan & stabil)`);
});

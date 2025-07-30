#!/bin/bash

echo "🚀 Setting up chatGenZ in GitHub Codespaces..."

# 1. Install Ollama
if ! command -v ollama &> /dev/null; then
  echo "📦 Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "✅ Ollama already installed."
fi

# 2. Pull lightweight model
echo "🧠 Downloading phi3:mini (fast & lightweight for coding)..."
ollama pull phi3:mini

# 3. Install Node.js dependencies
if [ -f "../package.json" ]; then
  cd .. && npm install
  echo "✅ Node.js dependencies installed."
else
  echo "❌ package.json not found!"
  exit 1
fi

# 4. Create start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🔥 Starting Ollama server..."
ollama serve &
sleep 10

echo "🚀 Starting chatGenZ server..."
npm run dev
EOF

chmod +x start.sh

echo "✅ Setup selesai! Jalankan: ./start.sh"
echo "   Lalu buka Port 3000 untuk mengakses chatGenZ"
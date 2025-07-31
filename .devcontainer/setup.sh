#!/bin/bash

echo "🚀 Setting up chatGenZ in GitHub Codespaces..."

# 1. Install Ollama
if ! command -v ollama &> /dev/null; then
  echo "📦 Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "✅ Ollama already installed."
fi

# 2. Pull lightweight model (quantized, low RAM)
echo "🧠 Downloading phi3:3.8b-mini-q4_0 (optimized for low RAM)..."
ollama pull phi3:3.8b-mini-q4_0

# 3. Ensure we are in the correct workspace directory
WORKSPACE_DIR=$(find /workspaces -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "$WORKSPACE_DIR" ]; then
  echo "❌ Tidak ditemukan folder di /workspaces"
  exit 1
fi

cd "$WORKSPACE_DIR" || { echo "❌ Gagal masuk ke $WORKSPACE_DIR"; exit 1; }

echo "📁 Masuk ke direktori: $(pwd)"

# 4. Check for package.json
if [ ! -f "package.json" ]; then
  echo "❌ File 'package.json' tidak ditemukan!"
  echo "💡 Pastikan kamu upload semua file ke repo GitHub."
  exit 1
fi

# 5. Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# 6. Create start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🔥 Starting Ollama server..."
ollama serve &
sleep 15

echo "🚀 Starting chatGenZ server..."
npm run dev
EOF

chmod +x start.sh

echo "✅ Setup selesai!"
echo "💡 Jalankan: ./start.sh"
echo "   Lalu klik 'Port 3000' di panel bawah untuk membuka chatGenZ"

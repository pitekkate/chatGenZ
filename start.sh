#!/bin/bash
echo "🔥 Starting Ollama server..."
ollama serve &
sleep 15

echo "🚀 Starting chatGenZ server..."
npm run dev

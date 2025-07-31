#!/bin/bash
echo "🔥 Starting Ollama..."
ollama serve &
sleep 15
echo "🚀 Starting chatGenZ..."
npm run dev

#!/bin/bash
echo "🔥 Starting Ollama..."
ollama serve &
sleep 10
echo "🚀 Starting chatGenZ..."
npm run dev
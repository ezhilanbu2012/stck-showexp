#!/bin/bash

# Kill ports if running (optional, but good for restart)
fuser -k 5000/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null

echo "Starting Backend Server..."
cd backend
python3 server.py &
BACKEND_PID=$!
cd ..

echo "Starting Frontend Server..."
cd frontend
# Using Python to serve the frontend on port 3000
python3 -m http.server 3000 &
FRONTEND_PID=$!
cd ..

echo "App is running!"
echo "Backend: http://127.0.0.1:5000"
echo "Frontend: http://127.0.0.1:3000"
echo "Press Ctrl+C to stop."

# Wait for process
wait $BACKEND_PID $FRONTEND_PID

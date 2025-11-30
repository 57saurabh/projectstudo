#!/bin/bash

echo "🌍 Starting ngrok tunnels with auto-env updates..."

# Kill old tunnels
kill $(lsof -ti:4040,4041,4042 2>/dev/null) 2>/dev/null

##############################################
# FRONTEND TUNNEL (Next.js root app)
##############################################
ngrok http 3000 --log=stdout --log-format=json > frontend.log &
sleep 2
FRONTEND_URL=$(grep -o '"public_url":"[^"]*' frontend.log | head -1 | cut -d'"' -f4)

##############################################
# BACKEND TUNNEL
##############################################
ngrok http 4000 --log=stdout --log-format=json > backend.log &
sleep 2
BACKEND_URL=$(grep -o '"public_url":"[^"]*' backend.log | head -1 | cut -d'"' -f4)

##############################################
# FACE SERVICE TUNNEL
##############################################
ngrok http 5000 --log=stdout --log-format=json > face.log &
sleep 2
FACE_URL=$(grep -o '"public_url":"[^"]*' face.log | head -1 | cut -d'"' -f4)

echo ""
echo "=============================================="
echo "🚀 NGROK TUNNELS CREATED"
echo "=============================================="
echo "🌐 Frontend URL:     $FRONTEND_URL"
echo "🔌 Backend URL:      $BACKEND_URL"
echo "🧠 Face-Service URL: $FACE_URL"
echo "=============================================="
echo ""

##############################################
# UPDATE FRONTEND ENV  (root .env.local)
##############################################
FRONTEND_ENV=".env.local"

echo "⚙ Updating frontend env: $FRONTEND_ENV"

[ ! -f "$FRONTEND_ENV" ] && touch "$FRONTEND_ENV"

# remove old values
sed -i '' "/NEXT_PUBLIC_API_URL/d" $FRONTEND_ENV
sed -i '' "/NEXT_PUBLIC_FACE_URL/d" $FRONTEND_ENV

# add new ones
echo "NEXT_PUBLIC_API_URL=\"$BACKEND_URL\"" >> $FRONTEND_ENV
echo "NEXT_PUBLIC_FACE_URL=\"$FACE_URL\"" >> $FRONTEND_ENV


##############################################
# UPDATE BACKEND ENV
##############################################
BACKEND_ENV="./backend/.env"
echo "⚙ Updating backend env: $BACKEND_ENV"

[ ! -f "$BACKEND_ENV" ] && touch "$BACKEND_ENV"

sed -i '' "/FACE_SERVICE_URL/d" $BACKEND_ENV
sed -i '' "/PUBLIC_BASE_URL/d" $BACKEND_ENV

echo "FACE_SERVICE_URL=\"$FACE_URL\"" >> $BACKEND_ENV
echo "PUBLIC_BASE_URL=\"$FRONTEND_URL\"" >> $BACKEND_ENV


##############################################
# UPDATE FACE SERVICE ENV
##############################################
FACE_ENV="./face-service/.env"
echo "⚙ Updating face-service env: $FACE_ENV"

[ ! -f "$FACE_ENV" ] && touch "$FACE_ENV"

sed -i '' "/BACKEND_URL/d" $FACE_ENV

echo "BACKEND_URL=\"$BACKEND_URL\"" >> $FACE_ENV


##############################################
# RESTART BACKEND + FRONTEND AUTOMATICALLY
##############################################
echo ""
echo "♻ Restarting backend + frontend to apply new env..."

# Kill previous node processes
pkill -f "next dev" 2>/dev/null
pkill -f "node" 2>/dev/null

# Restart frontend (root)
npm run dev &

# Restart backend
cd backend
npm run dev &
cd ..

echo ""
echo "=============================================="
echo "🔥 All services updated & restarted"
echo "🌐 Public Frontend: $FRONTEND_URL"
echo "=============================================="
echo ""

wait

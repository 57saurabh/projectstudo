# API & Signaling Specification

## REST API Endpoints

### Auth
- `POST /api/auth/login`: Send magic link/OTP.
- `POST /api/auth/verify`: Verify OTP, return JWT.
- `POST /api/auth/refresh`: Refresh access token.

### User
- `GET /api/user/me`: Get current user profile.
- `PATCH /api/user/me`: Update profile (avatar, settings).
- `GET /api/user/:privateId`: Lookup user by Private ID.

### Friends
- `POST /api/friends/request`: Send friend request.
- `POST /api/friends/accept`: Accept request.
- `GET /api/friends`: List friends.

### Admin
- `GET /api/admin/violations`: List recent violations.
- `POST /api/admin/ban`: Ban user.

## WebSocket Events (Socket.io)

### Connection
- Handshake query: `token` (JWT).

### Random Chat
- **Client -> Server**
  - `find-match`: Request to join random queue.
  - `leave-queue`: Cancel request.
  - `skip`: End current call and find new match.
- **Server -> Client**
  - `match-found`: `{ peerId, initiator: boolean }`

### Signaling (WebRTC)
- **Client -> Server**
  - `offer`: `{ target: peerId, sdp: RTCSessionDescription }`
  - `answer`: `{ target: peerId, sdp: RTCSessionDescription }`
  - `ice-candidate`: `{ target: peerId, candidate: RTCIceCandidate }`
- **Server -> Client**
  - `offer`: `{ sender: peerId, sdp }`
  - `answer`: `{ sender: peerId, sdp }`
  - `ice-candidate`: `{ sender: peerId, candidate }`

### Group Calls (SFU - Mediasoup)
- **Client -> Server**
  - `join-room`: `{ roomId }`
  - `create-transport`: Request to create WebRTC transport.
  - `connect-transport`: `{ transportId, dtlsParameters }`
  - `produce`: `{ transportId, kind, rtpParameters }` (Publish stream)
  - `consume`: `{ producerId, rtpCapabilities }` (Subscribe to stream)
- **Server -> Client**
  - `new-peer`: `{ peerId }`
  - `peer-left`: `{ peerId }`
  - `new-producer`: `{ producerId, peerId, kind }` (Someone turned on cam/mic)

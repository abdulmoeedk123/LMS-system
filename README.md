# Lumen LMS: PayPal premium access (MERN)
1. `cd server && cp .env.example .env` (add PayPal sandbox keys + Mongo URI), then `npm i && npm run seed && npm run dev`
2. `cd client && cp .env.example .env` (same sandbox client ID), then `npm i && npm run dev`
3. Open http://localhost:5173, register, unlock a premium course with a PayPal sandbox buyer account.
Flow: create-order (server prices from DB) -> PayPal approval -> capture-order (server verifies amount, adds course to user) -> /courses/:id/content is gated by ownership.

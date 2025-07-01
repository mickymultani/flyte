Flyte is a real-time enterprise messaging platform for airport operations, inspired by WhatsApp in simplicity and speed, but purpose-built for secure and structured communication between airport teams.

The system will use:

✅ Socket.IO as the real-time messaging layer
✅ Supabase for authentication, user management, storage, and RLS-enforced data access
✅ React (with Vite) for the frontend
✅ Netlify for frontend hosting
✅ Fly.io for hosting the Socket.IO backend (Node.js)

The Socket.IO implementation is core to this project — it must deliver real-time message delivery across 1:1 and group chats in a fully abstracted way. Users should never see or interact with rooms; all subscriptions and message routing are handled automatically based on their assigned chats.

🛠 Development Sequence
The project must be built in the following order to enable logical testing and access controls:

✅ Phase 1: Admin Panel (Web Only)
The very first deliverable is a secure Admin Panel accessible only by Super Admins. This must include:

Enterprise Management

Add/edit/delete an enterprise

Set enterprise name and contact email

Domain Whitelisting

Add allowed corporate email domains for each enterprise

These domains control which users are allowed to register

Usage Metrics View (Optional for MVP)

View user count, message count, storage per enterprise (can be dummy for now)

Only once an enterprise and domain are created, should the developer move to user registration.

✅ Phase 2: User Registration & Authentication
Once the admin has created an enterprise and whitelisted a domain:

Registration is enabled for users with matching email domains

Each user must register with:

Full Name

Corporate Email (must match domain whitelist)

Password (securely hashed)

The backend automatically links them to the correct enterprise based on email domain

✅ Phase 3: Real-Time Messaging (Socket.IO)
Using Socket.IO:

Users automatically receive messages from 1:1 and group chats they’re assigned to

No chat room joining from frontend

All message routing and delivery must be handled by the backend based on user’s assigned groups

Scheduled access logic must enforce visibility at the backend level

✅ Phase 4: Chat UI, Actions, Filtering, Tagging
Final phase involves building a WhatsApp-like chat interface with:

Message input and display

Action assignment

Tagging

Filtering (urgent/critical/tasks)

Reaction system

File attachments


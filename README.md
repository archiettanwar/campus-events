# CampusLab — Real-Time Campus Lab Availability & Hardware Checkout Portal

**CampusLab** is a full-stack MERN + real-time synchronization web application built to streamline college laboratory occupancy tracking, council/club room bookings, and hardware kit checkouts[cite: 1]. Instead of walking across campus to check if a lab is occupied or manually logging hardware in paper registers, students can inspect live lab occupancy, view weekly schedules, and submit equipment/room requests that Lab Assistants approve and manage in real time[cite: 1].

---

## Live Deployment

- **Frontend (Vercel):** [https://campus-events-beige.vercel.app](https://campus-events-beige.vercel.app)[cite: 1]
- **Backend API (Render):** [https://campus-events-1xea.onrender.com](https://campus-events-1xea.onrender.com)[cite: 2]

---

## Demo Credentials

Use the pre-seeded accounts below to test the end-to-end workflow across two browser windows:

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campus.edu` | `Student@1234` | Check live lab status, request hardware kits, book open lab slots for council meetings, track checkout status |
| **Lab Assistant** | `assistant1@campus.edu` | `Lab@1234` | Approve/reject checkout & room requests, add pickup notes, restore hardware stock on return, manage lab timetables |

---

## Core Features

### 1. Live Lab Occupancy & Weekly Timetable
- **Real-Time Status Cards:** Displays live availability (`FREE NOW` or active session details) for campus labs such as *AI & High-Performance Computing Lab*, *Computer Lab 1 (Software & Web)*, and *Embedded & IoT Hardware Lab*[cite: 1].
- **Interactive Weekly Timetable:** Filter scheduled lectures, practicals, tests, and approved student council meetings by day (`Mon` – `Sat`)[cite: 1].
- **Automatic Timetable Blocking:** When a Lab Assistant approves a room/council booking, the slot is automatically added to the weekly schedule and reflected in live occupancy.

### 2. Hardware Kit & Lab Room Catalog
- **Live Stock Tracking:** Tracks real-time available vs. total stock for microcontroller kits, sensors, VR headsets, single-board computers, logic analyzers, and presentation gear[cite: 1].
- **Search & Category Filtering:** Filter instantly across **All**, **Equipment Kits**, and **Lab Rooms** or search by hardware specs and components[cite: 1].

### 3. Role-Based Student & Lab Assistant Workflows
- **Student Portal (`My Checkouts`):** Submit hardware checkout quantities or council/PC access time slots, view approval notes from lab staff, and track request states (`PENDING`, `APPROVED`, `RETURNED`, `REJECTED`)[cite: 6].
- **Lab Assistant Console:** Centralized multi-assistant operations dashboard showing live pending counts, active checkouts, and timetable slots[cite: 6]. Approving a hardware request automatically deducts available inventory, and clicking **Mark Returned & Restore Stock** replenishes inventory immediately.

### 4. Hybrid Real-Time Synchronization
- Combines **Socket.IO** event broadcasts (`resource:updated`, `schedule:updated`, `request:created`, `request:statusChanged`) with a 4-second background auto-sync fallback and live navbar connection indicator (`Live` / `Syncing...`) so multi-tab sessions remain synchronized even across serverless/free-tier proxy environments.

---

## Tech Stack

- **Frontend:** React (Vite), React Router, Tailwind CSS, Axios, Socket.IO Client
- **Backend:** Node.js, Express.js, Socket.IO, JSON Web Tokens (JWT), bcryptjs
- **Database:** MongoDB Atlas with Mongoose ODM
- **Hosting & CI/CD:** Vercel (Frontend) & Render (Backend Web Service)[cite: 1, 2]

---

## Project Structure

```text
campus-events/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Navbar, booking/checkout modals, status badges
│   │   ├── context/            # AuthContext for JWT session & role management
│   │   ├── pages/              # HomePage, LoginPage, RegisterPage, MyRequestsPage, AssistantDashboardPage
│   │   └── services/           # Axios API client & Socket.IO configuration
│   └── vercel.json             # SPA client-side routing rewrite rules
├── server/                     # Node.js + Express + Socket.IO backend
│   ├── src/
│   │   ├── config/             # MongoDB connection setup
│   │   ├── controllers/        # Auth, resource, schedule, and request logic
│   │   ├── middleware/         # JWT authentication & role authorization guards
│   │   ├── models/             # Mongoose schemas (User, Resource, ScheduleSlot, Request)
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── seed/               # Database seeder for labs, hardware kits, timetables & demo users
│   │   └── index.js            # Express + HTTP + Socket.IO server entry point
└── README.md
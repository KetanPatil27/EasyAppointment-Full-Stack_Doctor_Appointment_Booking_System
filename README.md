# 🩺 EasyAppointment — Full-Stack Doctor Appointment Booking System

A comprehensive doctor appointment booking platform built with **Next.js 16** (frontend) and **Feathers.js v5** (backend), powered by **MongoDB**. EasyAppointment streamlines the process of finding doctors, booking appointments, managing prescriptions, and communicating between patients and doctors — all within a single, modern web application.

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Variables](#-environment-variables)
  - [Backend .env](#backend-env)
  - [Frontend .env.local](#frontend-envlocal)
- [Running the Application](#-running-the-application)
- [Default User Roles](#-default-user-roles)
- [API Services](#-api-services)
- [Important Notes](#-important-notes)

---

## ✨ Key Features

| Module | Highlights |
|--------|-----------|
| **Authentication** | JWT-based login/signup, role-based access (Admin, Doctor, Patient), password reset via email with token expiry |
| **Doctor Management** | Profile with qualifications, clinic details, specialization, languages, consultation fee, and availability slots |
| **Appointment Booking** | Search doctors → select slot → book appointment, with status tracking (Pending, Confirmed, Completed, Cancelled, Rescheduled) |
| **Patient Dashboard** | View appointments, health insights, prescription history, and message doctors |
| **Doctor Dashboard** | Manage slots, view/confirm appointments, write prescriptions, and track ratings |
| **Admin Dashboard** | Approve doctor registrations, manage users, monitor appointments, view analytics & revenue reports |
| **Messaging** | Doctor-patient chat linked to appointments |
| **Prescriptions** | Doctors create prescriptions tied to appointments; patients view them |
| **Ratings & Reviews** | Patients rate doctors; average ratings displayed on profiles |
| **Email Notifications** | Appointment booked/confirmed emails and password reset emails via Nodemailer |
| **Search & Filters** | Filter doctors by name, specialization, city, locality, and pincode |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, shadcn/ui, Recharts, Axios, Zod, React Hook Form |
| **Backend** | Feathers.js v5, Express, TypeScript, TypeBox schema validation, Nodemailer, Winston logger |
| **Database** | MongoDB 6+ (via Feathers MongoDB adapter) |
| **Auth** | JWT (Feathers Authentication), bcryptjs |

---

## 📁 Project Structure

```
EasyAppointment-Full-Stack_Doctor_Appointment_Booking_System/
│
├── backend-appointment-fixed/
│   └── backend/
│       ├── src/
│       │   ├── services/          # Feathers services (users, doctors, appointments, etc.)
│       │   ├── utils/             # Mailer utility, helpers
│       │   └── index.ts           # App entry point
│       ├── config/                # Feathers configuration
│       ├── .env                   # Backend environment variables
│       └── package.json
│
├── frontend-appointment-fixed/
│   └── frontend/
│       ├── app/                   # Next.js App Router pages
│       │   ├── admin/             # Admin dashboard
│       │   ├── dashboard/         # Patient dashboard
│       │   ├── doctor/            # Doctor dashboard
│       │   ├── doctors/           # Doctor listing & profile
│       │   ├── login/             # Login page
│       │   ├── register/          # Registration page
│       │   ├── forgot-password/   # Forgot password flow
│       │   ├── reset-password/    # Reset password page
│       │   ├── checkout/          # Appointment checkout
│       │   └── booking-confirmation/
│       ├── components/            # Reusable UI components
│       ├── services/              # API service layer (Axios)
│       ├── lib/                   # Utility functions
│       ├── .env.local             # Frontend environment variables
│       └── package.json
│
└── README.md                      # ← You are here
```

---

## ✅ Prerequisites

Make sure you have the following installed on your machine before proceeding:

| Tool | Minimum Version | Download Link |
|------|----------------|---------------|
| **Node.js** | v18.0.0 or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ (comes with Node.js) | — |
| **MongoDB** | v6.0 or higher | [mongodb.com/try/download](https://www.mongodb.com/try/download/community) |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com/) |

> **Note:** MongoDB must be running locally on the default port (`27017`), or you can use a MongoDB Atlas connection string instead.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/KetanPatil27/EasyAppointment-Full-Stack_Doctor_Appointment_Booking_System.git
cd EasyAppointment-Full-Stack_Doctor_Appointment_Booking_System
```

---

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend-appointment-fixed/backend

# Install dependencies
npm install

# Create the .env file (see "Environment Variables" section below)
# Then start the backend dev server
npm run dev
```

The backend will start on **http://localhost:2029**.

---

### 3. Frontend Setup

Open a **new terminal** window:

```bash
# Navigate to the frontend directory
cd frontend-appointment-fixed/frontend

# Install dependencies
npm install

# Create the .env.local file (see "Environment Variables" section below)
# Then start the frontend dev server
npm run dev
```

The frontend will start on **http://localhost:3000**.

---

## 🔐 Environment Variables

### Backend `.env`

Create a `.env` file inside `backend-appointment-fixed/backend/` with the following content:

```env
# Port on which the backend server will run
PORT=2029

# MongoDB connection string
# For local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/easyappointment-db
# For MongoDB Atlas (replace with your own):
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/easyappointment-db?retryWrites=true&w=majority

# Secret key for signing JWT tokens (use any random string)
JWT_SECRET=your_random_jwt_secret_key_here_change_this

# Gmail credentials for sending emails (Nodemailer)
# You need to generate a Google App Password for this
# Guide: https://support.google.com/accounts/answer/185833
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_google_app_password

# Environment mode
NODE_ENV=development
```

#### How to get `MAIL_USER` and `MAIL_PASS`:

1. Go to your [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail" on "Windows Computer"
5. Use your Gmail address as `MAIL_USER` and the 16-character app password as `MAIL_PASS`

---

### Frontend `.env.local`

Create a `.env.local` file inside `frontend-appointment-fixed/frontend/` with the following content:

```env
# Backend API URL — must match the PORT in backend .env
NEXT_PUBLIC_API_URL=http://localhost:2029
```

> If you change the backend `PORT`, update this URL accordingly.

---

## ▶ Running the Application

You need **two terminals** running simultaneously:

| Terminal | Directory | Command | URL |
|----------|----------|---------|-----|
| Terminal 1 (Backend) | `backend-appointment-fixed/backend` | `npm run dev` | http://localhost:2029 |
| Terminal 2 (Frontend) | `frontend-appointment-fixed/frontend` | `npm run dev` | http://localhost:3000 |

**Startup order:**
1. Make sure **MongoDB** is running first
2. Start the **Backend** server
3. Start the **Frontend** server
4. Open **http://localhost:3000** in your browser

---

## 👤 Default User Roles

When registering a new account, users can sign up as:

| Role | Access |
|------|--------|
| **Patient** | Search doctors, book appointments, view prescriptions, message doctors, manage profile |
| **Doctor** | Manage profile & availability, accept/reject appointments, write prescriptions, view ratings |
| **Admin** | Approve/reject doctor registrations, manage all users, view analytics, monitor appointments |

> **Note:** New doctor accounts require **Admin approval** before they become visible to patients.

---

## 📡 API Services

The backend exposes the following Feathers.js services:

| Service | Endpoint | Description |
|---------|----------|-------------|
| Users | `/users` | User registration and management |
| Doctors | `/doctors` | Doctor profiles and details |
| Patients | `/patients` | Patient profiles |
| Appointments | `/appointment` | Appointment booking and management |
| Slots | `/slots` | Doctor availability slot management |
| Prescriptions | `/prescriptions` | Prescription creation and viewing |
| Messages | `/messages` | Doctor-patient messaging |
| Reviews | `/reviews` | Patient ratings and reviews |
| Health Data | `/health-data` | Patient health insights |
| Password Reset | `/password-resets` | Password reset token management |
| Forgot Password | `/forgot-password` | Initiate password reset email |
| Reset Password | `/reset-password` | Complete password reset with token |

---

## ⚠ Important Notes

1. **MongoDB must be running** before starting the backend. If using local MongoDB, ensure the `mongod` service is active.

2. **Email functionality** requires valid Gmail credentials with an App Password. Without this, features like password reset and appointment confirmation emails will not work.

3. **Both servers must run simultaneously** — the frontend communicates with the backend API via Axios.

4. **Admin account** — To access the admin dashboard, you need to manually set a user's role to `admin` in the MongoDB database, or seed the database with an admin user.

5. **Node version** — Ensure you're using Node.js v18 or higher. The backend explicitly requires `>= 18.0.0` in `engines`.

6. **CORS** — In development mode, the backend allows requests from `http://localhost:3000` by default. No additional configuration is needed for local development.

7. **Browser** — For the best experience, use the latest version of Chrome, Firefox, or Edge.

---

## 📄 License

This project is developed for educational and training purposes as part of the MERN Stack Training program.

---

<p align="center">
  Built with ❤️ by <strong>Ketan Patil</strong>
</p>

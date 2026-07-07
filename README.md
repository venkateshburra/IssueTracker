# Issue Tracker

A full-stack Issue Tracking application built with React, Tailwind CSS, and Supabase. The application helps teams organize work, manage issues, collaborate efficiently, and track project progress.

## Live Demo

https://issue-tracker-kappa-ochre.vercel.app/

## GitHub Repository

https://github.com/venkateshburra/IssueTracker

---

## Tech Stack

### Frontend
- React
- React Router DOM
- Tailwind CSS
- Vite

### Backend & Database
- Supabase

### Authentication
- Supabase Authentication
- Email & Password
- Google OAuth

---

## Features

### Authentication
- Email & Password Login
- Google OAuth Login
- Persistent User Session
- Protected Routes

### Workspace Management
- Create Workspace
- Switch Between Workspaces
- Invite Team Members
- Workspace Member Management

### Role-Based Access Control (RBAC)
- Admin
- Project Manager (PM)
- Member

### Task Management
- Create Task
- Edit Task
- Delete Task
- Assign Tasks
- Due Dates
- Priority Levels (P1, P2, P3)
- Labels
- Task Status

### Sections
- Create Sections
- Update Sections
- Delete Sections

### Views
- Kanban Board
- List View

### Collaboration
- Task Comments
- Workspace Members

### Responsive Design
- Desktop
- Tablet
- Mobile

---

## Database

The project uses Supabase PostgreSQL.

Main Tables

- profiles
- workspaces
- workspace_members
- sections
- tasks
- comments
- notifications

---

## Getting Started

### Clone Repository

```bash
git clone https://github.com/venkateshburra/IssueTracker.git
```

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file.

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
```

### Start Development Server

```bash
npm run dev
```


## Author

Venkatesh Burra

GitHub:
https://github.com/venkateshburra

# Issue Tracker - Full Stack Application

## 🎯 Project Overview

A comprehensive, responsive issue tracking application built with React, Vite, Tailwind CSS, and Supabase. Perfect for team collaboration and project management.

## ✅ Completed Features

### 1. **Authentication**
- Email signup with automatic profile creation
- Email login
- Session persistence
- Automatic profile management (prevents foreign key errors)
- Logout functionality

### 2. **Dashboard**
- Responsive layout with collapsible sidebar
- Navigation to all modules
- Real-time unread notification counter
- User info display
- Modern gradient design

### 3. **Sections Management**
- Create custom sections/categories
- Update section names
- Delete sections
- List sections in responsive grid
- Each section displays creation date

### 4. **Tasks Module** ⭐
- **CRUD Operations:**
  - Create tasks with detailed fields
  - Edit tasks
  - Delete tasks
  - View task details with comments
  
- **Task Fields:**
  - Title & Description
  - Priority (P1, P2, P3)
  - Status (Todo, In Progress, Done)
  - Labels (Bug, Feature, User Story)
  - Due dates
  - Section assignment
  
- **Features:**
  - Search tasks
  - Filter by status, priority, section
  - Task detail modal with comments
  - Share tokens (generated automatically)

### 5. **Kanban Board**
- Visual board with 3 columns (Todo, In Progress, Done)
- Drag and drop to update task status
- Real-time status updates to database
- Task count for each column
- Priority indicators (color-coded)

### 6. **List View**
- Responsive table layout
- Sort by: Latest, Priority, Status, Due Date
- Filter by status and priority
- Display all task details
- Hover effects

### 7. **Team Management**
- View all team members
- Invite new members via email
- Assign roles (Admin, PM, Member)
- Update member roles
- Remove members
- Member creation date tracking

### 8. **Comments System**
- Add comments to tasks
- View all comments with timestamps
- User information in comments
- Delete own comments
- Auto-notification when commented on
- Real-time comment updates

### 9. **Notifications**
- View all notifications
- Mark as read/unread
- Delete notifications
- Filter unread only
- Real-time updates (Supabase subscription)
- Clear all notifications

## 🎨 UI/UX Features

- **Modern Design:** Gradient backgrounds, card-based layouts
- **Color Scheme:** Blue/Indigo gradients for primary actions, status colors
- **Responsive:** Fully responsive on mobile, tablet, desktop
- **Smooth Transitions:** Hover effects, focus states, smooth animations
- **Accessibility:** Proper labels, semantic HTML, keyboard navigation
- **Icons:** Emoji icons for visual appeal and quick recognition

## 📁 Project Structure

```
src/
├── components/
│   ├── ProtectedRoute.jsx      # Route protection
│   ├── Comments.jsx             # Comments component
│   └── TaskDetail.jsx           # Task detail modal
├── context/
│   └── AuthContext.jsx          # Auth state & profile management
├── pages/
│   ├── Login.jsx                # Authentication page
│   ├── Dashboard.jsx            # Main layout
│   ├── Sections.jsx             # Sections CRUD
│   ├── Tasks.jsx                # Tasks management
│   ├── Kanban.jsx               # Kanban board
│   ├── List.jsx                 # List view
│   ├── Team.jsx                 # Team management
│   └── Notifications.jsx        # Notifications center
├── utils/
│   └── supabase.js              # Supabase client
├── App.jsx                      # Route definitions
├── main.jsx                     # Entry point
└── index.css                    # Tailwind imports
```

## 🗄️ Database Schema

### profiles
- `id` - UUID (PK, FK to auth.users)
- `name` - Text
- `email` - Text
- `role` - Enum (admin, pm, member)
- `created_at` - Timestamp

### sections
- `id` - UUID (PK)
- `name` - Text
- `created_by` - UUID (FK to profiles)
- `created_at` - Timestamp

### tasks
- `id` - UUID (PK)
- `title` - Text
- `description` - Text
- `status` - Enum (Todo, In Progress, Done)
- `priority` - Enum (P1, P2, P3)
- `label` - Enum (Bug, Feature, User Story)
- `due_date` - Date
- `section_id` - UUID (FK)
- `assigned_to` - UUID (FK)
- `created_by` - UUID (FK)
- `visibility_role` - Enum (for RBAC)
- `share_token` - Text (unique)
- `created_at` - Timestamp

### comments
- `id` - UUID (PK)
- `task_id` - UUID (FK to tasks)
- `user_id` - UUID (FK to profiles)
- `comment` - Text
- `created_at` - Timestamp

### notifications
- `id` - UUID (PK)
- `user_id` - UUID (FK to profiles)
- `message` - Text
- `is_read` - Boolean
- `created_at` - Timestamp

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Supabase account
- Tailwind CSS configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables in `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

3. Start the development server:
```bash
npm run dev
```

## 🔧 Key Functions

### Authentication
- `ensureProfileExists()` - Automatically creates profile on sign up/login
- `signUp()` - Register new user
- `signIn()` - Login user
- `logout()` - Sign out and redirect

### Tasks
- `getTasks()` - Fetch user's tasks
- `saveTask()` - Create or update task
- `deleteTask()` - Delete task
- `updateTaskStatus()` - Update task status

### Comments
- `addComment()` - Post comment on task
- `deleteComment()` - Delete own comment
- `getComments()` - Fetch task comments

### Notifications
- `checkUnreadNotifications()` - Get unread count
- `markAsRead()` - Mark notification as read
- `deleteNotification()` - Remove notification

## 📋 Role-Based Access Control (RBAC)

### Current Implementation
- Admin: Full access
- PM (Project Manager): Can view all tasks, edit status
- Member: Only assigned tasks

### Future Enhancement
- Visibility rules per task
- Department-level permissions
- Custom role creation

## 🔄 Real-Time Features

- Notifications update via Supabase subscriptions
- Task status changes sync across views
- Comment updates in real-time
- Member list updates

## 📱 Responsive Design

- **Mobile (<768px):** Single column, collapsed sidebar, touch-friendly buttons
- **Tablet (768px-1024px):** Two columns, responsive grid
- **Desktop (>1024px):** Full layout, sidebar always visible

## 🎯 To-Do List

### Remaining Features
- [ ] Google OAuth login integration
- [ ] Email notifications on task assignment
- [ ] Automatic notification for overdue tasks
- [ ] Advanced RBAC with visibility rules
- [ ] Task sharing with external users
- [ ] Email digest
- [ ] File attachments in comments
- [ ] Activity timeline
- [ ] Export tasks to CSV/PDF
- [ ] Dark mode

### Performance Optimizations
- [ ] Implement pagination for task lists
- [ ] Add caching for sections
- [ ] Optimize queries with indexes
- [ ] Lazy load images

## 🐛 Known Issues & Solutions

### Foreign Key Constraints
✅ **Fixed:** Profiles are now auto-created via `ensureProfileExists()` in AuthContext

### RLS Policies
⚠️ **Note:** RLS is currently disabled. Enable when ready for production.

## 🔐 Security Considerations

1. **Enable Row Level Security (RLS)** when ready for production
2. **Use environment variables** for sensitive data
3. **Validate inputs** on both client and server
4. **Implement rate limiting** for API calls
5. **Add CSRF protection** for forms

## 📞 Support & Debugging

### Check Console
- Open browser DevTools (F12)
- Check Network tab for Supabase requests
- Check Console for error messages

### Common Errors
- **Foreign key error:** Profile doesn't exist → Run profile creation logic
- **Auth not persisting:** Check session → Clear cache and refresh
- **Notifications not updating:** Check subscription status

## 🎓 Learning Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Hooks Guide](https://react.dev/reference/react)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Docs](https://vitejs.dev)

## 📈 Deployment

### Vercel (Recommended)
```bash
npm run build
```
Deploy the `dist` folder to Vercel

### GitHub Pages
Configure in `vite.config.js` and deploy

### Netlify
Connect GitHub repo directly

## 📝 License

This project is built as a technical assignment for interview purposes.

---

**Last Updated:** July 5, 2026
**Status:** MVP Complete - Ready for Deployment

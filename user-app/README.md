# Bangla Coin Frontend 🎨

This directory contains the user interface for Bangla Coin, built with React and Vite. It provides a premium, responsive, and intuitive experience for interacting with the Friction-First blockchain.

## 🛠️ Technology Stack

- **Framework:** [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) for utility-first styling and responsive design.
- **Animations:** [Framer Motion](https://www.framer.com/motion/) for fluid page transitions, layout animations, and micro-interactions.
- **Icons:** [Lucide React](https://lucide.dev/) for clean, professional iconography.
- **Internationalization:** `react-i18next` for seamless switching between English and Bengali (বাংলা).

## ✨ Key Features

- **Premium Glassmorphism UI:** Deep emerald gradients, frosted glass panels, and subtle animated ambient glows.
- **Friction Timer Modal:** A beautiful animated countdown that intercepts high-risk transactions.
- **Global Toast Notifications:** Custom, highly-animated toast messages for success/error feedback.
- **Responsive Layout:** Fully optimized for mobile, tablet, and desktop viewing.
- **Bilingual Interface:** Instant language toggling without page reloads.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Ensure you have a `.env` file in this directory (or fallback to defaults):
```env
VITE_API_URL=http://localhost:3001
```

### 3. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## 📁 Directory Structure

- `/src/components`: Reusable UI elements (FreezeButton, Toast, FlagWarning).
- `/src/pages`: Main application views (Home, Send, DAO, Explorer).
- `/src/i18n`: Translation JSON files for English and Bengali.
- `index.css`: Global styles, custom Tailwind utilities, and keyframe animations.
- `App.jsx`: Main application shell, routing, and authentication flow.

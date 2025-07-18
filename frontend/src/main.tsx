import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { NotificationProvider } from './contexts/NotificationContext'
import { ToastContainer } from './components/Toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationProvider>
      <BrowserRouter>
        <App />
        <ToastContainer />
      </BrowserRouter>
    </NotificationProvider>
  </React.StrictMode>,
) 
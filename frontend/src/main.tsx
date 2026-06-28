import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { QueryProvider } from './app/providers/QueryProvider'
import { AuthProvider } from './lib/auth/AuthContext'
import { installMocks } from './features/sqps/api/mock'
import './styles/global.css'

if(import.meta.env.VITE_ENABLE_MOCKS==='true') installMocks()
createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><QueryProvider><App/></QueryProvider></AuthProvider></StrictMode>)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Prompt-style updates: never swap versions mid-lesson (plan, Section 4).
// The confirm() is a placeholder until the real toast/dialog UI exists.
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version of LearnXRP is available. Reload now?')) {
      updateSW(true)
    }
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

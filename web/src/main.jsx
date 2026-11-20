import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css?v=1'
import Home from './Home.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)

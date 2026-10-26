import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { isUat } from './lib/appEnv'
import './index.css'

if (isUat) {
  document.title = "School Cab Admin (UAT)"
}

createRoot(document.getElementById("root")!).render(<App />);

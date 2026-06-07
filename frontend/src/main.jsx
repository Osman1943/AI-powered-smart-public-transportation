import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// React-Bootstrap'in çalışması için gereken en kritik CSS dosyası!
import 'bootstrap/dist/css/bootstrap.min.css'; 
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
import './App.css'
import { supabase } from './supabaseClient'
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import UploadDocument from './pages/UploadDocument'
import Documents from './pages/Documents'
import ShareDocument from './pages/ShareDocument'
import EditDocument from './pages/EditDocument'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './ProtectedRoute'

function App() {
  const [role, setRole] = useState(null)
  useEffect(() => {
  const loadRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setRole(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error(error)
      return
    }

    setRole(data.role)
    
  }

  loadRole()
}, [])
  return (
  <>

    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
  path="/upload"
  element={
    <ProtectedRoute>
      {role === 'ADMIN' || role === 'OWNER'
        ? <UploadDocument />
        : <h2>Access Denied</h2>}
    </ProtectedRoute>
  }
/>
        <Route
  path="/documents"
  element={
    <ProtectedRoute>
      <Documents />
    </ProtectedRoute>
  }
/>
        <Route
  path="/share/:documentId"
  element={
    <ProtectedRoute>
      <ShareDocument />
    </ProtectedRoute>
  }
/>
        <Route
  path="/edit/:documentId"
  element={
    <ProtectedRoute>
      <EditDocument />
    </ProtectedRoute>
  }
/>
        <Route
  path="/admin"
  element={
    <ProtectedRoute>
      {role === 'ADMIN'
        ? <AdminDashboard />
        : <h2>Access Denied</h2>}
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  </>
)
}

export default App
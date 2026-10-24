import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
function AdminDashboard() {
    const [logs, setLogs] = useState([])
const [message, setMessage] = useState('')
const successfulLogs = logs.filter((log) => log.success)
const deniedLogs = logs.filter((log) => !log.success)

useEffect(() => {
  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    setLogs(data)
  }

  loadLogs()
}, [])
  return (
  <div>
    <h1>Admin Dashboard</h1>
    <div>
  <h3>Total Activities: {logs.length}</h3>
  <h3>Successful: {successfulLogs.length}</h3>
  <h3>Denied: {deniedLogs.length}</h3>
</div>

    {message && <p>{message}</p>}

    <h2>Activity Logs</h2>

    {logs.length === 0 ? (
  <p>No activity recorded yet.</p>
) : (
  <table border="1" cellPadding="8">
    <thead>
      <tr>
        <th>Action</th>
        <th>User ID</th>
        <th>Document ID</th>
        <th>Status</th>
        <th>Time</th>
      </tr>
    </thead>

    <tbody>
      {logs.map((log) => (
        <tr key={log.id}>
          <td>{log.action}</td>
          <td>{log.user_id}</td>
          <td>{log.document_id || '-'}</td>
          <td>{log.success ? 'Success' : 'Denied'}</td>
          <td>{new Date(log.created_at).toLocaleString()}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}
  </div>
)
}

export default AdminDashboard
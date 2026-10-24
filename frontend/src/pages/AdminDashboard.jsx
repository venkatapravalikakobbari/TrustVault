import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
function AdminDashboard() {
    const [logs, setLogs] = useState([])
const [message, setMessage] = useState('')
const [statusFilter, setStatusFilter] = useState('ALL')

const filteredLogs =
  statusFilter === 'ALL'
    ? logs
    : logs.filter((log) =>
        statusFilter === 'SUCCESS'
          ? log.success
          : !log.success
      )
const [actionFilter, setActionFilter] = useState('ALL')
const actionFilteredLogs =
  actionFilter === 'ALL'
    ? filteredLogs
    : filteredLogs.filter((log) => log.action === actionFilter)
const successfulLogs = logs.filter((log) => log.success)
const deniedLogs = logs.filter((log) => !log.success)
const totalEvents = logs.length
const formatAction = (action) => {
  const labels = {
    UPLOAD: 'Document Uploaded',
    DOWNLOAD: 'Document Downloaded',
    EDIT: 'Document Edited',
    DELETE: 'Document Deleted',
    GRANT_ACCESS: 'Access Granted',
    UPDATE_PERMISSION: 'Permission Updated',
    REVOKE_ACCESS: 'Access Revoked',
    UNAUTHORIZED_ACCESS: 'Unauthorized Access',
  }

  return labels[action] || action
}

useEffect(() => {
  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, documents(name)')
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
    <h3>Total Events: {totalEvents}</h3>
    <p>Successful: {successfulLogs.length}</p>
    <p>Denied: {deniedLogs.length}</p>
    <div>
</div>

    {message && <p>{message}</p>}

    <h2>Activity Logs</h2>

<select
  value={statusFilter}
  onChange={(event) => setStatusFilter(event.target.value)}
>
  <option value="ALL">All Activities</option>
  <option value="SUCCESS">Successful Only</option>
  <option value="DENIED">Denied Only</option>
</select>

<select
  value={actionFilter}
  onChange={(event) => setActionFilter(event.target.value)}
>
  <option value="ALL">All Actions</option>
  <option value="UPLOAD">Document Uploaded</option>
  <option value="DOWNLOAD">Document Downloaded</option>
  <option value="EDIT">Document Edited</option>
  <option value="DELETE">Document Deleted</option>
  <option value="GRANT_ACCESS">Access Granted</option>
  <option value="UPDATE_PERMISSION">Permission Updated</option>
  <option value="REVOKE_ACCESS">Access Revoked</option>
  <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
</select>
    {logs.length === 0 ? (
  <p>No activity recorded yet.</p>
) : (
  <table border="1" cellPadding="8">
    <thead>
      <tr>
        <th>Action</th>
        <th>User ID</th>
        <th>Document</th>
        <th>Status</th>
        <th>Time</th>
      </tr>
    </thead>

    <tbody>
      {actionFilteredLogs.map((log) => (
        <tr key={log.id}>
          <td>{formatAction(log.action)}</td>
          <td>{log.user_id}</td>
          <td>
  {log.documents?.name || log.details?.file_name || '-'}
</td>
          
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
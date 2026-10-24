import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function AdminDashboard() {
  const [logs, setLogs] = useState([])
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')

  const filteredLogs =
    statusFilter === 'ALL'
      ? logs
      : logs.filter((log) =>
          statusFilter === 'SUCCESS'
            ? log.success
            : !log.success
        )

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
    <main className="admin-dashboard">
      <div className="admin-container">
        <header className="admin-header">
          <div className="admin-header-content">
            <p className="admin-eyebrow">TrustVault <span>/</span> Administration</p>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">
              Monitor document activity, permissions, and security events.
            </p>
          </div>
          <span className="admin-header-mark" aria-hidden="true">A</span>
        </header>

        <section className="admin-stats" aria-label="Activity summary">
          <article className="admin-stat-card">
            <span className="admin-stat-icon stat-icon-events" aria-hidden="true">◎</span>
            <p>Total Events</p>
            <strong>{totalEvents}</strong>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-icon stat-icon-success" aria-hidden="true">✓</span>
            <p>Successful</p>
            <strong>{successfulLogs.length}</strong>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-icon stat-icon-denied" aria-hidden="true">!</span>
            <p>Denied</p>
            <strong>{deniedLogs.length}</strong>
          </article>
        </section>

        {message && (
          <div className="admin-error" role="status">
            {message}
          </div>
        )}

        <section className="admin-section" aria-labelledby="admin-activity-title">
          <div className="admin-section-header">
            <div>
              <p className="admin-section-kicker">Security overview</p>
              <h2 id="admin-activity-title">Activity Logs</h2>
              <p>Security and document activity across your tenant.</p>
            </div>

            <div className="admin-filters">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="admin-filter-select"
                aria-label="Filter activity by status"
              >
                <option value="ALL">All Activities</option>
                <option value="SUCCESS">Successful Only</option>
                <option value="DENIED">Denied Only</option>
              </select>

              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value)
                }
                className="admin-filter-select"
                aria-label="Filter activity by action"
              >
                <option value="ALL">All Actions</option>
                <option value="UPLOAD">Document Uploaded</option>
                <option value="DOWNLOAD">Document Downloaded</option>
                <option value="EDIT">Document Edited</option>
                <option value="DELETE">Document Deleted</option>
                <option value="GRANT_ACCESS">Access Granted</option>
                <option value="UPDATE_PERMISSION">
                  Permission Updated
                </option>
                <option value="REVOKE_ACCESS">
                  Access Revoked
                </option>
                <option value="UNAUTHORIZED_ACCESS">
                  Unauthorized Access
                </option>
              </select>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-empty-mark" aria-hidden="true">—</span>
              <h3>No activity recorded yet</h3>
              <p>Document and security events will appear here.</p>
            </div>
          ) : actionFilteredLogs.length === 0 ? (
            <div className="admin-empty-state admin-empty-filtered">
              No logs match the selected filters.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Action</th>
                    <th scope="col">User</th>
                    <th scope="col">Document</th>
                    <th scope="col">Status</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>

                <tbody>
                  {actionFilteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="admin-action-cell">
                        {formatAction(log.action)}
                      </td>

                      <td className="admin-user-cell">
                        {log.user_id || '-'}
                      </td>

                      <td className="admin-document-cell">
                        {log.documents?.name ||
                          log.details?.file_name ||
                          '-'}
                      </td>

                      <td>
                        <span className={`admin-badge ${log.success ? 'admin-badge-success' : 'admin-badge-denied'}`}>
                          <span className="admin-badge-dot" aria-hidden="true" />
                          {log.success ? 'Success' : 'Denied'}
                        </span>
                      </td>

                      <td className="admin-time-cell">
                        {new Date(
                          log.created_at
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default AdminDashboard
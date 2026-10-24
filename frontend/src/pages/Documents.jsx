import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Documents() {
  const navigate = useNavigate()

  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [accessLevels, setAccessLevels] = useState({})

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  useEffect(() => {
    const loadDocuments = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMessage('You must be logged in.')
        return
      }

      setUser(user)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setMessage(profileError.message)
        return
      }

      setRole(profile.role)

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_permissions (
            user_id,
            permission
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        setMessage(error.message)
        return
      }

      setDocuments(data)

      const levels = {}

      for (const document of data) {
        if (document.owner_id === user.id) {
          levels[document.id] = 'Owner'
          continue
        }

        const { data: permission } = await supabase
          .from('document_permissions')
          .select('permission')
          .eq('document_id', document.id)
          .eq('user_id', user.id)
          .maybeSingle()

        levels[document.id] = permission?.permission || 'READ'
      }

      setAccessLevels(levels)
    }

    loadDocuments()
  }, [])

  const handleDownload = async (document) => {
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      'check_document_access',
      {
        doc_id: document.id,
      }
    )

    if (accessError) {
      setMessage(accessError.message)
      return
    }

    if (!hasAccess) {
      setMessage('You are not authorized to download this document.')
      return
    }

    const { data: signedUrlData, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, 60)

    if (error) {
      setMessage(error.message)
      return
    }

    const { data: auditSuccess, error: auditError } = await supabase.rpc(
  'log_document_download',
  {
    doc_id: document.id,
  }
)

    if (auditError) {
      setMessage(auditError.message)
      return
    }

    if (!auditSuccess) {
      setMessage('Download was not authorized.')
      return
    }

    window.open(signedUrlData.signedUrl, '_blank')
  }

  const handleDelete = async (document) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.name}"?`
    )

    if (!confirmed) {
      return
    }

    const { data: deleteSuccess, error: deleteError } = await supabase.rpc(
      'delete_document',
      {
        doc_id: document.id,
      }
    )

    if (deleteError) {
      setMessage(deleteError.message)
      return
    }

    if (!deleteSuccess) {
      setMessage('You are not allowed to delete this document.')
      return
    }

    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.storage_path])

    if (storageError) {
      setMessage(storageError.message)
      return
    }

    setDocuments((currentDocuments) =>
      currentDocuments.filter((item) => item.id !== document.id)
    )

    setMessage('Document deleted successfully!')
  }

  const filteredDocuments = documents.filter(
    (document) =>
      document.name.toLowerCase().includes(search.toLowerCase()) &&
      (categoryFilter === '' || document.category === categoryFilter) &&
      (dateFilter === '' || document.created_at.startsWith(dateFilter))
  )

  return (
    <div className="documents-page">
      <div className="documents-container">
        <header className="documents-header">
          <div className="documents-heading">
            <p className="documents-eyebrow">TrustVault <span>/</span> Documents</p>
            <h1>My Documents</h1>
            <p className="documents-subtitle">
              Manage and access your documents securely.
            </p>
          </div>

          <div className="document-count-card" aria-label={`${documents.length} documents`}>
            <span className="document-count-label">Your library</span>
            <strong>{documents.length}</strong>
            <span className="document-count-unit">
              document{documents.length === 1 ? '' : 's'}
            </span>
          </div>
        </header>

        <div className="documents-actions">
          <Link to="/upload" className="document-button document-button-primary">
            <span aria-hidden="true">+</span> Upload Document
          </Link>

          {role === 'ADMIN' && (
            <Link to="/admin" className="document-button document-button-secondary">
              Admin Dashboard
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="document-button document-button-subtle"
          >
            Logout
          </button>
        </div>

        <section className="document-filters" aria-labelledby="document-filter-heading">
          <div className="document-filters-heading">
            <div>
              <h2 id="document-filter-heading">Find Documents</h2>
              <p>Search and narrow your library.</p>
            </div>
          </div>

          <div className="document-filters-grid">
            <input
              type="text"
              placeholder="Search by document name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="document-filter-input"
              aria-label="Search by document name"
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="document-filter-input"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Technical">Technical</option>
              <option value="Other">Other</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="document-filter-input"
              aria-label="Filter by creation date"
            />
          </div>
        </section>

        {message && (
          <div
            className={`documents-message ${message.includes('successfully') ? 'is-success' : 'is-error'}`}
            role="status"
          >
            {message}
          </div>
        )}

        <div className="document-results-summary">
          <p>Showing <strong>{filteredDocuments.length}</strong> of {documents.length} documents</p>
        </div>

        {filteredDocuments.length === 0 && (
          <div className="documents-empty-state">
            <span className="documents-empty-icon" aria-hidden="true">—</span>
            <h2>No documents found</h2>
            <p>
              Try changing your search or filters, or upload a new document.
            </p>
          </div>
        )}

        <div className="documents-list">
          {filteredDocuments.map((document) => (
            <article key={document.id} className="document-card">
              <div className="document-card-header">
                <div className="document-card-details">
                  <h2>{document.name}</h2>
                  <div className="document-metadata">
                    <span>{document.category || 'Uncategorized'}</span>
                    <span className="document-metadata-separator" aria-hidden="true">·</span>
                    <span>Created {new Date(document.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className={`document-access-badge access-${(accessLevels[document.id] || 'read').toLowerCase()}`}>
                  <span className="document-access-label">Access</span>
                  <strong>{accessLevels[document.id]}</strong>
                </div>
              </div>

              <hr className="document-card-divider" />

              <div className="document-actions">
                <button
                  onClick={() => handleDownload(document)}
                  className="document-button document-button-download"
                >
                  Download
                </button>

                {user && document.owner_id === user.id && (
                  <button
                    onClick={() => handleDelete(document)}
                    className="document-button document-button-danger"
                  >
                    Delete
                  </button>
                )}

                {user &&
                  (document.owner_id === user.id ||
                    document.document_permissions?.some(
                      (permission) =>
                        permission.user_id === user.id &&
                        permission.permission === 'EDIT'
                    )) && (
                    <Link to={`/edit/${document.id}`} className="document-button document-button-secondary">
                      Edit
                    </Link>
                  )}

                {user && document.owner_id === user.id && (
                  <Link to={`/share/${document.id}`} className="document-button document-button-share">
                    Share
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Documents


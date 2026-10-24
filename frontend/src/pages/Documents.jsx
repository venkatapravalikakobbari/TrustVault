import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'



function Documents() {
  const navigate = useNavigate()
  const handleLogout = async () => {
  await supabase.auth.signOut()
  navigate('/')
}
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [user, setUser] = useState(null)
  const [accessLevels, setAccessLevels] = useState({})

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
    file_name: document.name,
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

  // First verify ownership and create the DELETE audit record.
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

  // Now remove the actual file from Supabase Storage.
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

  return (
    <div>
      <h1>My Documents</h1>
      <button onClick={handleLogout}>Logout</button>
      <input
       type="text"
       placeholder="Search documents..."
       value={search}
       onChange={(event) => setSearch(event.target.value)}
       />
       <select
  value={categoryFilter}
  onChange={(event) => setCategoryFilter(event.target.value)}
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
/>
      

      {message && <p>{message}</p>}

      {documents
  .filter((document) =>
  document.name.toLowerCase().includes(search.toLowerCase()) &&
  (categoryFilter === '' || document.category === categoryFilter) &&
  (dateFilter === '' || document.created_at.startsWith(dateFilter))
)
  .map((document) => (
        <div key={document.id}>
          <h3>{document.name}</h3>
          <p>Category: {document.category}</p>
          <p>Access: {accessLevels[document.id]}</p>
          <p>Created: {document.created_at}</p>
          
          <button onClick={() => handleDownload(document)}>
            Download
          </button>
          {user && document.owner_id === user.id && (
  <button onClick={() => handleDelete(document)}>
    Delete
            
  </button>
  
  
  )}
          {user &&
  (
    document.owner_id === user.id ||
    document.document_permissions?.some(
      (permission) =>
        permission.user_id === user.id &&
        permission.permission === 'EDIT'
    )
  ) && (
    <Link to={`/edit/${document.id}`}>
      <button>Edit</button>
    </Link>
  )}
          {user && document.owner_id === user.id && (
  <Link to={`/share/${document.id}`}>
    <button>Share</button>
  </Link>
)}
          <hr />
        </div>
      ))}
    </div>
  )
}

export default Documents
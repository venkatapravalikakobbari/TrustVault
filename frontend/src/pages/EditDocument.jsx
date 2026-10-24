import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function EditDocument() {
  const { documentId } = useParams()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadDocument = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('name, category')
        .eq('id', documentId)
        .single()

      if (error) {
        setMessage(error.message)
        return
      }

      setName(data.name)
      setCategory(data.category || '')
    }

    loadDocument()
  }, [documentId])

  const handleUpdate = async (event) => {
    event.preventDefault()

    const { data: updatedDocument, error } = await supabase
  .from('documents')
  .update({
    name,
    category,
    updated_at: new Date().toISOString(),
  })
  .eq('id', documentId)
  .select()
  .maybeSingle()

if (error) {
  setMessage(error.message)
  return
}

if (!updatedDocument) {
  setMessage('You are not allowed to edit this document.')
  return
}
    const {
  data: { user },
} = await supabase.auth.getUser()

const { data: tenantId, error: tenantError } = await supabase
  .rpc('get_user_tenant_id')

if (tenantError) {
  setMessage(tenantError.message)
  return
}

const { data: auditSuccess, error: auditError } = await supabase.rpc(
  'log_document_edit',
  {
    doc_id: documentId,
    new_name: name,
    new_category: category,
  }
)

if (auditError) {
  setMessage(auditError.message)
  return
}

if (!auditSuccess) {
  setMessage('You are not authorized to edit this document.')
  return
}

setMessage('Document updated successfully!')
  }

  return (
    <div>
      <h1>Edit Document</h1>

      <form onSubmit={handleUpdate}>
        <div>
          <label>Name</label>
          <br />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Category</label>
          <br />
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </div>

        <br />

        <button type="submit">Save Changes</button>
      </form>

      {message && <p>{message}</p>}

      <button onClick={() => navigate('/documents')}>
        Back to Documents
      </button>
    </div>
  )
}

export default EditDocument
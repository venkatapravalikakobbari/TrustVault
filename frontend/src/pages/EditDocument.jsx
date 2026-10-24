import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function EditDocument() {
  const { documentId } = useParams()

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

    const { data: auditSuccess, error: auditError } =
      await supabase.rpc('log_document_edit', {
        doc_id: documentId,
        new_name: name,
        new_category: category,
      })

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
    <main className="edit-page">
      <div className="edit-container">
        <Link to="/documents" className="edit-back-link">
          <span aria-hidden="true">←</span> Back to Documents
        </Link>

        <header className="edit-header">
          <p className="edit-eyebrow">TrustVault <span>/</span> Documents</p>
          <h1>Edit Document</h1>
          <p>Update the document name or category.</p>
        </header>

        <section className="edit-card" aria-labelledby="edit-form-title">
          <div className="edit-card-heading">
            <h2 id="edit-form-title">Document details</h2>
            <p>Changes will be saved to this document.</p>
          </div>

          <form onSubmit={handleUpdate} className="edit-form">
            <div className="edit-form-group">
              <label className="edit-form-label">
                <strong>Document Name</strong>
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="edit-form-input"
              />
            </div>

            <div className="edit-form-group">
              <label className="edit-form-label">
                <strong>Category</strong>
              </label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="edit-form-select"
              >
                <option value="">Select a category</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Technical">Technical</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="edit-form-actions">
              <button type="submit" className="edit-save-button">
                Save Changes
              </button>
            </div>
          </form>

          {message && (
            <div
              className={`edit-message ${message.includes('successfully') ? 'edit-success' : 'edit-error'}`}
              role="status"
            >
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default EditDocument
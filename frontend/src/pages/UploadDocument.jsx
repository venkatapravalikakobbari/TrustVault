
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function UploadDocument() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
    ]

    if (!allowedTypes.includes(file.type)) {
      setMessage('Only PDF, PNG, and JPG/JPEG files are allowed.')
      return
    }

    const maxSize = 10 * 1024 * 1024

    if (file.size > maxSize) {
      setMessage('File size must be less than 10 MB.')
      return
    }

    const filePath = Date.now() + '-' + file.name

    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (error) {
      setMessage(error.message)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      await supabase.storage
        .from('documents')
        .remove([filePath])

      setMessage('You must be logged in to upload a document.')
      return
    }

    const { data: tenantId, error: tenantError } = await supabase
      .rpc('get_user_tenant_id')

    if (tenantError) {
      await supabase.storage
        .from('documents')
        .remove([filePath])

      setMessage(tenantError.message)
      return
    }

    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        owner_id: user.id,
        name: name,
        category: category,
        storage_path: filePath,
      })
      .select()
      .single()

    if (documentError) {
      await supabase.storage
        .from('documents')
        .remove([filePath])

      setMessage(documentError.message)
      return
    }

    const { data: auditSuccess, error: auditError } = await supabase.rpc(
      'log_document_upload',
      {
        doc_id: documentData.id,
        file_name: name,
      }
    )

    if (auditError) {
      setMessage(auditError.message)
      return
    }

    if (!auditSuccess) {
      setMessage('Upload audit verification failed.')
      return
    }

    setMessage('File uploaded successfully!')
  }

  return (
    <main className="upload-page">
      <div className="upload-container">
        <Link to="/documents" className="upload-back-link">
          <span aria-hidden="true">←</span> Back to Documents
        </Link>

        <header className="upload-header">
          <p className="upload-eyebrow">TrustVault <span>/</span> Documents</p>
          <h1>Upload Document</h1>
          <p>Securely upload and organize your documents.</p>
        </header>

        <section className="upload-card" aria-labelledby="upload-card-title">
          <div className="upload-card-heading">
            <div>
              <h2 id="upload-card-title">Document details</h2>
              <p>Provide a name, choose a category, and select a file.</p>
            </div>
          </div>

          <div className="upload-form">
            <div className="upload-form-group">
              <label htmlFor="upload-document-name" className="upload-form-label">
                Document Name
              </label>
              <input
                id="upload-document-name"
                type="text"
                placeholder="Enter document name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="upload-form-input"
              />
            </div>

            <div className="upload-form-group">
              <label htmlFor="upload-document-category" className="upload-form-label">
                Category
              </label>
              <select
                id="upload-document-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="upload-form-select"
              >
                <option value="">Select a category</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Technical">Technical</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="upload-form-group">
              <label htmlFor="upload-document-file" className="upload-form-label">
                Select File
              </label>
              <div className="upload-file-area">
                <span className="upload-file-icon" aria-hidden="true">↑</span>
                <div className="upload-file-copy">
                  <strong>Choose a document to upload</strong>
                  <span>PDF, PNG, JPG or JPEG · Maximum size 10 MB</span>
                </div>
                <input
                  id="upload-document-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => setFile(event.target.files[0])}
                  className="upload-file-input"
                />
              </div>
            </div>

            {file && (
              <div className="upload-selected-file">
                <span className="upload-selected-file-icon" aria-hidden="true">▤</span>
                <div className="upload-file-info">
                  <span className="upload-file-info-label">Selected file</span>
                  <strong>{file.name}</strong>
                </div>
              </div>
            )}

            <div className="upload-actions">
              <button
                onClick={handleUpload}
                className="upload-button"
              >
                Upload Document
              </button>
            </div>

            {message && (
              <p
                className={`upload-message ${message.includes('successfully') ? 'upload-success' : 'upload-error'}`}
                role="status"
              >
                {message}
              </p>
            )}
          </div>

          <div className="upload-security-note">
            <span className="upload-security-mark" aria-hidden="true">✓</span>
            <span>Your document is stored securely.</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default UploadDocument

import { useState } from 'react'
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

  const filePath = `${Date.now()}-${file.name}`

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
  const { data: tenantId, error: tenantError } = await supabase
  .rpc('get_user_tenant_id')

  if (tenantError) {
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
    setMessage(documentError.message)
    return
  }

  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      document_id: documentData.id,
      action: 'UPLOAD',
      success: true,
      details: {
        file_name: name,
      },
    })

  if (auditError) {
    setMessage(auditError.message)
    return
  }

  setMessage('File uploaded successfully!')
}

  return (
    <div>
      <h1>Upload Document</h1>

      <div>
        <label>Document Name</label>
        <br />
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <br />

      <div>
        <label>Category</label>
        <br />
        <input
          type="text"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </div>

      <br />

      <div>
        <label>File</label>
        <br />
        <input
          type="file"
          onChange={(event) => setFile(event.target.files[0])}
        />
      </div>

      <br />

      {file && <p>Selected file: {file.name}</p>}

      <button onClick={handleUpload}>Upload</button>
      {message && <p>{message}</p>}
    </div>
  )
}

export default UploadDocument
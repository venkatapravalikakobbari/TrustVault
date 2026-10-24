import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function ShareDocument() {
  const { documentId } = useParams()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('READ')
  const [message, setMessage] = useState('')
  const [permissions, setPermissions] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  useEffect(() => {
  const loadPermissions = async () => {
    const { data: ownerStatus, error: ownerError } = await supabase.rpc(
      'is_document_owner',
      {
        doc_id: documentId,
      }
    )

    if (!ownerError) {
      setIsOwner(ownerStatus)
    }

    const { data, error } = await supabase
      .from('document_permissions')
      .select('id, user_id, permission, created_at')
      .eq('document_id', documentId)

    if (error) {
      setMessage(error.message)
      return
    }

    const permissionsWithEmails = await Promise.all(
      data.map(async (item) => {
        const { data: email, error: emailError } = await supabase.rpc(
          'get_user_email',
          {
            target_user_id: item.user_id,
          }
        )

        if (emailError) {
          return {
            ...item,
            email: 'Unknown user',
          }
        }

        return {
          ...item,
          email,
        }
      })
    )

    setPermissions(permissionsWithEmails)
  }

  loadPermissions()
}, [documentId])
  const handleGrantAccess = async () => {
  if (!email) {
    setMessage('Please enter a user email')
    return
  }

  const { data: userId, error } = await supabase
    .rpc('get_user_id_by_email', {
      target_email: email,
    })

  if (error) {
    setMessage(error.message)
    return
  }

  if (!userId) {
    setMessage('User not found in your tenant')
    return
  }

  const { data: existingPermission, error: permissionCheckError } =
    await supabase
      .from('document_permissions')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .maybeSingle()

  if (permissionCheckError) {
    setMessage(permissionCheckError.message)
    return
  }

  if (existingPermission) {
  const { data: updatedPermission, error: updateError } = await supabase
    .from('document_permissions')
    .update({
      permission: permission,
    })
    .eq('id', existingPermission.id)
    .select()
    .maybeSingle()

  if (updateError) {
    setMessage(updateError.message)
    return
  }

  if (!updatedPermission) {
    setMessage('You are not allowed to change this permission.')
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
  'log_permission_update',
  {
    doc_id: documentId,
    target_user_id: userId,
    permission_level: permission,
  }
)

if (auditError) {
  setMessage(auditError.message)
  return
}

if (!auditSuccess) {
  setMessage('Permission update could not be verified.')
  return
}

  

  setMessage('Permission updated successfully!')
  return
}

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error: insertError } = await supabase
    .from('document_permissions')
    .insert({
      document_id: documentId,
      user_id: userId,
      permission: permission,
      granted_by: user.id,
    })

  if (insertError) {
    setMessage(insertError.message)
    return
  }

  const { data: tenantId, error: tenantError } = await supabase
  .rpc('get_user_tenant_id')

if (tenantError) {
  setMessage(tenantError.message)
  return
}

const { data: auditSuccess, error: auditError } = await supabase.rpc(
  'log_permission_grant',
  {
    doc_id: documentId,
    target_user_id: targetUserId,
    permission_level: permission,
  }
)

if (auditError) {
  setMessage(auditError.message)
  return
}

if (!auditSuccess) {
  setMessage('Permission grant could not be verified.')
  return
}


setMessage('Access granted successfully!')
}
const handleRevokeAccess = async () => {
  if (!email) {
    setMessage('Please enter a user email')
    return
  }

  const { data: userId, error } = await supabase
    .rpc('get_user_id_by_email', {
      target_email: email,
    })

  if (error) {
    setMessage(error.message)
    return
  }

  if (!userId) {
    setMessage('User not found in your tenant')
    return
  }

  const { data: deletedPermission, error: deleteError } = await supabase
  .from('document_permissions')
  .delete()
  .eq('document_id', documentId)
  .eq('user_id', userId)
  .select()
  .maybeSingle()

if (deleteError) {
  setMessage(deleteError.message)
  return
}

if (!deletedPermission) {
  setMessage('You are not allowed to revoke this permission.')
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
  'log_permission_revoke',
  {
    doc_id: documentId,
    target_user_id: userId,
  }
)

if (auditError) {
  setMessage(auditError.message)
  return
}

if (!auditSuccess) {
  setMessage('Permission revoke could not be verified.')
  return
}

setMessage('Access revoked successfully!')
}
const handleRevokeByUserId = async (userId) => {
  const confirmed = window.confirm(
    'Are you sure you want to revoke this user\'s access?'
  )

  if (!confirmed) {
    return
  }

  const { data: deletedPermission, error } = await supabase
  .from('document_permissions')
  .delete()
  .eq('document_id', documentId)
  .eq('user_id', userId)
  .select()
  .maybeSingle()

if (error) {
  setMessage(error.message)
  return
}

if (!deletedPermission) {
  setMessage('You are not allowed to revoke this permission.')
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
  'log_permission_revoke',
  {
    doc_id: documentId,
    target_user_id: userId,
  }
)

if (auditError) {
  setMessage(auditError.message)
  return
}

if (!auditSuccess) {
  setMessage('Permission revoke could not be verified.')
  return
}

  setPermissions((currentPermissions) =>
    currentPermissions.filter((item) => item.user_id !== userId)
  )

  setMessage('Access revoked successfully!')
}


  return (
    <div>
      <h1>Share Document</h1>

      <div>
        <label>User Email</label>
        <br />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <br />

      <div>
        <label>Permission</label>
        <br />

        <select
          value={permission}
          onChange={(event) => setPermission(event.target.value)}
        >
          <option value="READ">Read</option>
          <option value="EDIT">Edit</option>
        </select>
      </div>

      <br />

      {isOwner && (
  <>
    <button onClick={handleGrantAccess}>Grant Access</button>
    <button onClick={handleRevokeAccess}>Revoke Access</button>
  </>
)}
      <h2>Shared With</h2>

{permissions.length === 0 ? (
  <p>No users have access to this document.</p>
) : (
  permissions.map((item) => (
    <div key={item.id}>
      <p>Email: {item.email}</p>
      <p>Permission: {item.permission}</p>
      {isOwner && (
  <button onClick={() => handleRevokeByUserId(item.user_id)}>
    Revoke
  </button>
)}
      <hr />
    </div>
  ))
)}
      {message && <p>{message}</p>}
    </div>
  )
}

export default ShareDocument
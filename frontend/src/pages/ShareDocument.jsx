import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

    const { data: userId, error } = await supabase.rpc(
      'get_user_id_by_email',
      {
        target_email: email,
      }
    )

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

      const { data: auditSuccess, error: auditError } =
        await supabase.rpc('log_permission_update', {
          doc_id: documentId,
          target_user_id: userId,
          permission_level: permission,
        })

      if (auditError) {
        setMessage(auditError.message)
        return
      }

      if (!auditSuccess) {
        setMessage('Permission update could not be verified.')
        return
      }

      setMessage('Permission updated successfully!')
      setEmail('')
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

    const { data: auditSuccess, error: auditError } =
      await supabase.rpc('log_permission_grant', {
        doc_id: documentId,
        target_user_id: userId,
        permission_level: permission,
      })

    if (auditError) {
      setMessage(auditError.message)
      return
    }

    if (!auditSuccess) {
      setMessage('Permission grant could not be verified.')
      return
    }

    setPermissions((currentPermissions) => [
      ...currentPermissions,
      {
        id: `new-${userId}`,
        user_id: userId,
        permission,
        email,
      },
    ])

    setEmail('')
    setMessage('Access granted successfully!')
  }

  const handleRevokeAccess = async () => {
    if (!email) {
      setMessage('Please enter a user email')
      return
    }

    const { data: userId, error } = await supabase.rpc(
      'get_user_id_by_email',
      {
        target_email: email,
      }
    )

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

    const { data: auditSuccess, error: auditError } =
      await supabase.rpc('log_permission_revoke', {
        doc_id: documentId,
        target_user_id: userId,
      })

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

    setEmail('')
    setMessage('Access revoked successfully!')
  }

  const handleRevokeByUserId = async (userId) => {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this user's access?"
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

    const { data: auditSuccess, error: auditError } =
      await supabase.rpc('log_permission_revoke', {
        doc_id: documentId,
        target_user_id: userId,
      })

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
    <main className="share-page">
      <div className="share-container">
        <Link to="/documents" className="share-back-link">
          <span aria-hidden="true">←</span> Back to Documents
        </Link>

        <header className="share-header">
          <p className="share-eyebrow">TrustVault <span>/</span> Documents</p>
          <h1>Share Document</h1>
          <p>Manage who can access this document and what they can do.</p>
        </header>

        {isOwner && (
          <section className="share-form-card" aria-labelledby="share-form-title">
            <div className="share-card-heading">
              <div>
                <h2 id="share-form-title">Grant Access</h2>
                <p>Enter a user from your tenant and choose their permission.</p>
              </div>
              <span className="share-owner-indicator">Owner access</span>
            </div>

            <div className="share-form">
              <div className="share-form-group share-email-group">
                <label htmlFor="share-user-email" className="share-form-label">
                  User Email
                </label>
                <input
                  id="share-user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="share-form-input"
                />
              </div>

              <div className="share-form-group share-permission-group">
                <label htmlFor="share-permission" className="share-form-label">
                  Permission
                </label>
                <select
                  id="share-permission"
                  value={permission}
                  onChange={(event) => setPermission(event.target.value)}
                  className="share-permission-select"
                >
                  <option value="READ">Read</option>
                  <option value="EDIT">Edit</option>
                </select>
              </div>

              <div className="share-form-actions">
                <button
                  onClick={handleGrantAccess}
                  className="share-primary-button"
                >
                  Grant / Update Access
                </button>

                <button
                  onClick={handleRevokeAccess}
                  className="share-revoke-button"
                >
                  Revoke by Email
                </button>
              </div>
            </div>
          </section>
        )}

        {message && (
          <div
            className={`share-message ${message.includes('successfully') ? 'share-success' : 'share-error'}`}
            role="status"
          >
            {message}
          </div>
        )}

        <section className="share-permissions-card" aria-labelledby="share-permissions-title">
          <div className="share-card-heading share-permissions-heading">
            <div>
              <h2 id="share-permissions-title">People with access</h2>
              <p>
                {permissions.length} user
                {permissions.length === 1 ? '' : 's'} currently have access.
              </p>
            </div>
          </div>

          {permissions.length === 0 ? (
            <div className="share-empty-state">
              <h3>No users have access yet</h3>
              <p>People granted access to this document will appear here.</p>
            </div>
          ) : (
            <div className="share-permissions-list">
              {permissions.map((item) => (
                <div key={item.id} className="share-permission-row">
                  <div className="share-person-details">
                    <strong className="share-person-email">{item.email}</strong>
                    <div className="share-permission-detail">
                      <span>Permission</span>
                      <span className="share-permission-badge">
                        {item.permission}
                      </span>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() =>
                        handleRevokeByUserId(item.user_id)
                      }
                      className="share-action-button share-revoke-button"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default ShareDocument
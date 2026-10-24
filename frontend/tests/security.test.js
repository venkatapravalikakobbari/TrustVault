import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

const env = loadEnv('test', process.cwd(), '')

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
)

describe('TrustVault security tests', () => {
  it('Tenant B cannot read Tenant A document', async () => {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: env.TEST_USER_B_EMAIL,
      password: env.TEST_USER_B_PASSWORD,
    })

    expect(loginError).toBeNull()

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', env.TEST_DOCUMENT_ID)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
  it('Tenant B cannot read Tenant A document permissions', async () => {
  const { data, error } = await supabase
    .from('document_permissions')
    .select('*')

  expect(error).toBeNull()
  expect(data).toHaveLength(0)
})
it('Tenant B cannot access Tenant A storage file', async () => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(env.TEST_STORAGE_PATH, 60)

  expect(data).toBeNull()
  expect(error).not.toBeNull()
})
it('Tenant B is denied by the document access check', async () => {
  const { data, error } = await supabase.rpc(
    'check_document_access',
    {
      doc_id: env.TEST_DOCUMENT_ID,
    }
  )

  expect(error).toBeNull()
  expect(data).toBe(false)
})
it('Tenant A owner can read their own document', async () => {
  await supabase.auth.signOut()

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: env.TEST_USER_A_EMAIL,
    password: env.TEST_USER_A_PASSWORD,
  })

  expect(loginError).toBeNull()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', env.TEST_DOCUMENT_ID)

  expect(error).toBeNull()
  expect(data).toHaveLength(1)
})
it('READ-only user cannot edit a document', async () => {
  const { data: userId, error: userError } = await supabase.rpc(
    'get_user_id_by_email',
    {
      target_email: env.TEST_USER_READ_EMAIL,
    }
  )

  expect(userError).toBeNull()
  expect(userId).not.toBeNull()

  // Set the permission while authenticated as the owner.
  const { error: permissionError } = await supabase
    .from('document_permissions')
    .update({
      permission: 'READ',
    })
    .eq('document_id', env.TEST_DOCUMENT_ID)
    .eq('user_id', userId)

  expect(permissionError).toBeNull()

  // Now actually become the READ-only user.
  await supabase.auth.signOut()

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: env.TEST_USER_READ_EMAIL,
    password: env.TEST_USER_READ_PASSWORD,
  })

  expect(loginError).toBeNull()

  const { data, error } = await supabase
    .from('documents')
    .update({
      name: 'Unauthorized Edit Attempt',
    })
    .eq('id', env.TEST_DOCUMENT_ID)
    .select()

  expect(error).toBeNull()
  expect(data).toHaveLength(0)
})
it('READ-only user cannot delete a document', async () => {
  const { data, error } = await supabase
    .from('documents')
    .delete()
    .eq('id', env.TEST_DOCUMENT_ID)
    .select()

  expect(error).toBeNull()
  expect(data).toHaveLength(0)
})
it('READ-only user cannot grant document permissions', async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  expect(user).not.toBeNull()

  const { data: ownerId, error: ownerError } = await supabase.rpc(
    'get_user_id_by_email',
    {
      target_email: env.TEST_USER_A_EMAIL,
    }
  )

  expect(ownerError).toBeNull()
  expect(ownerId).not.toBeNull()

  const { data, error } = await supabase
    .from('document_permissions')
    .insert({
      document_id: env.TEST_DOCUMENT_ID,
      user_id: ownerId,
      permission: 'READ',
      granted_by: user.id,
    })
    .select()

  expect(error).not.toBeNull()
  expect(data).toBeNull()
})
it('EDIT user can edit a document', async () => {
  // Become the owner so we can set the permission.
  await supabase.auth.signOut()

  const { error: ownerLoginError } = await supabase.auth.signInWithPassword({
    email: env.TEST_USER_A_EMAIL,
    password: env.TEST_USER_A_PASSWORD,
  })

  expect(ownerLoginError).toBeNull()

  const { data: userId, error: userError } = await supabase.rpc(
    'get_user_id_by_email',
    {
      target_email: env.TEST_USER_READ_EMAIL,
    }
  )

  expect(userError).toBeNull()
  expect(userId).not.toBeNull()

  const { data: updatedPermission, error: permissionError } = await supabase
    .from('document_permissions')
    .update({
      permission: 'EDIT',
    })
    .eq('document_id', env.TEST_DOCUMENT_ID)
    .eq('user_id', userId)
    .select()

  expect(permissionError).toBeNull()
  expect(updatedPermission).toHaveLength(1)

  // Now become the EDIT user.
  await supabase.auth.signOut()

  const { error: editLoginError } = await supabase.auth.signInWithPassword({
    email: env.TEST_USER_READ_EMAIL,
    password: env.TEST_USER_READ_PASSWORD,
  })

  expect(editLoginError).toBeNull()

  const { data, error } = await supabase
    .from('documents')
    .update({
      name: 'Security Test Edit',
    })
    .eq('id', env.TEST_DOCUMENT_ID)
    .select()

  expect(error).toBeNull()
  expect(data).toHaveLength(1)
  
})
it('EDIT user cannot grant document permissions', async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  expect(user).not.toBeNull()

  const { data: ownerId, error: ownerError } = await supabase.rpc(
    'get_user_id_by_email',
    {
      target_email: env.TEST_USER_A_EMAIL,
    }
  )

  expect(ownerError).toBeNull()
  expect(ownerId).not.toBeNull()

  const { data, error } = await supabase
    .from('document_permissions')
    .insert({
      document_id: env.TEST_DOCUMENT_ID,
      user_id: ownerId,
      permission: 'READ',
      granted_by: user.id,
    })
    .select()

  expect(error).not.toBeNull()
  expect(data).toBeNull()
})
it('Owner can delete a document and deletion is audited', async () => {
  await supabase.auth.signOut()

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: env.TEST_USER_A_EMAIL,
    password: env.TEST_USER_A_PASSWORD,
  })

  expect(loginError).toBeNull()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  expect(user).not.toBeNull()

  const { data: tenantId, error: tenantError } = await supabase.rpc(
    'get_user_tenant_id'
  )

  expect(tenantError).toBeNull()
  expect(tenantId).not.toBeNull()

  const { data: testDocument, error: createError } = await supabase
    .from('documents')
    .insert({
      tenant_id: tenantId,
      owner_id: user.id,
      name: 'Delete Audit Test',
      category: 'TEST',
      storage_path: 'test/delete-audit-test.pdf',
    })
    .select()
    .single()

  expect(createError).toBeNull()
  expect(testDocument).not.toBeNull()

  const { data: deleteSuccess, error: deleteError } = await supabase.rpc(
    'delete_document',
    {
      doc_id: testDocument.id,
    }
  )

  expect(deleteError).toBeNull()
  expect(deleteSuccess).toBe(true)

  const { data: deletedDocument, error: readError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', testDocument.id)

  expect(readError).toBeNull()
  expect(deletedDocument).toHaveLength(0)

  await supabase.auth.signOut()

const { error: adminLoginError } = await supabase.auth.signInWithPassword({
  email: env.TEST_ADMIN_EMAIL,
  password: env.TEST_ADMIN_PASSWORD,
})

expect(adminLoginError).toBeNull()

const { data: auditLog, error: auditError } = await supabase
  .from('audit_logs')
  .select('*')
  .contains('details', {
    document_id: testDocument.id,
  })
  .eq('action', 'DELETE')
  .eq('success', true)
  .maybeSingle()

expect(auditError).toBeNull()
expect(auditLog).not.toBeNull()
})
})
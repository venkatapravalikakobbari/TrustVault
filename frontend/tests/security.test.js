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
})
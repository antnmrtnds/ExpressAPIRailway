import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY // Use service key for server-side operations

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// Test connection on startup
supabase
  .from('users')
  .select('count')
  .limit(1)
  .then(({ error }) => {
    if (error) {
      console.error('Supabase connection failed in API Gateway:', error.message)
    } else {
      console.log('API Gateway: Supabase connection established')
    }
  }) 
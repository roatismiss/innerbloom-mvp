import { supabase } from '../supabase';

// Narrow helper so call-sites don't need to assert non-null repeatedly.
// Throws once at the boundary if Supabase env vars are missing.
export function sb() {
  if (!supabase) {
    throw new Error(
      'Supabase client not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

// Typed RPC wrapper. We don't put RPCs in the Database['Functions'] generic
// (see comment in types/database.ts), so this is the single point that
// casts away the rigid supabase-js signature. Args + return types come
// from the per-RPC type aliases in types/database.ts.
export async function callRpc<TArgs, TReturn>(
  name: string,
  args?: TArgs,
): Promise<TReturn> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = sb() as unknown as { rpc: (n: string, a?: any) => Promise<{ data: any; error: any }> };
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data as TReturn;
}

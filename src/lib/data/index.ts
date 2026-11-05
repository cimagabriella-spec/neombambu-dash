import { DemoProvider } from './demo-provider'
import { SupabaseProvider } from './supabase-provider'
import type { DataProvider } from './provider'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase quando configurado; caso contrário, modo demonstração explícito. */
export const provider: DataProvider & { subscribe?: (cb: () => void) => () => void } =
  url && key ? new SupabaseProvider(url, key) : new DemoProvider()

export type { DataProvider } from './provider'

import { supabase, errorMessage, TABLES } from '@/lib/supabase'

/** 站点设置：key -> value(jsonb) */
export async function listSettings() {
  const { data, error } = await supabase.from(TABLES.siteSettings).select('*').order('key')
  if (error) throw new Error(errorMessage(error, '加载站点配置失败'))
  const map = {}
  for (const row of data || []) map[row.key] = row.value
  return { rows: data || [], map }
}

/** 读取单个配置（未登录也可读，用于首页品牌展示） */
export async function getSetting(key, fallback = null) {
  const { data, error } = await supabase
    .from(TABLES.siteSettings)
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error || !data) return fallback
  return data.value ?? fallback
}

export async function saveSetting(key, value, description) {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from(TABLES.siteSettings)
    .upsert(
      {
        key,
        value,
        updated_by: auth?.user?.id ?? null,
        updated_at: new Date().toISOString(),
        ...(description ? { description } : {}),
      },
      { onConflict: 'key' },
    )
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存配置失败'))
  return data
}

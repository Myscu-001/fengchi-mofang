import { supabase, errorMessage, TABLES } from '@/lib/supabase'

const SELECT = `
  id, name, title, years_competing, years_teaching, avg_time,
  highlights, bio, avatar_url, sort_order, is_active, created_at, updated_at
`

/**
 * 师资列表。
 * 未登录时也能读取启用中的教练（首页展示用）；
 * 机构人员登录后可以看到包含停用记录的完整列表。
 */
export async function listCoaches({ includeInactive = false } = {}) {
  let query = supabase.from(TABLES.coaches).select(SELECT)

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(errorMessage(error, '加载师资团队失败'))
  return data || []
}

export async function getCoach(id) {
  const { data, error } = await supabase.from(TABLES.coaches).select(SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载教练信息失败'))
  return data
}

export async function createCoach(payload) {
  const { data, error } = await supabase.from(TABLES.coaches).insert(payload).select().single()
  if (error) throw new Error(errorMessage(error, '新增教练失败'))
  return data
}

export async function updateCoach(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.coaches)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存教练信息失败'))
  return data
}

export async function deleteCoach(coach) {
  const { error } = await supabase.from(TABLES.coaches).delete().eq('id', coach.id)
  if (error) throw new Error(errorMessage(error, '删除教练失败'))
  if (coach.avatar_url) {
    const path = storagePathFromUrl(coach.avatar_url)
    if (path) {
      await supabase.storage.from('avatars').remove([path]).catch(() => {})
    }
  }
}

/** 上传教练头像（走 avatars 公开桶，路径需以用户 id 开头才符合存储策略） */
export async function uploadCoachAvatar(file) {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('登录状态已失效')

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${uid}/coach-${Date.now().toString(36)}.${ext}`

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw new Error(errorMessage(error, '头像上传失败'))

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

/** 从公开 URL 反解出存储路径 */
function storagePathFromUrl(url) {
  const marker = '/object/public/avatars/'
  const idx = String(url).indexOf(marker)
  return idx === -1 ? null : decodeURIComponent(String(url).slice(idx + marker.length))
}

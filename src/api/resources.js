import { supabase, errorMessage, TABLES, BUCKETS } from '@/lib/supabase'
import { detectFileKind, safeStoragePath } from '@/lib/format'

function clean(kw) {
  return String(kw || '')
    .replace(/[,()]/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// 资源分类
// ---------------------------------------------------------------------------
export async function listCategories() {
  const { data, error } = await supabase
    .from(TABLES.resourceCategories)
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载资源分类失败'))
  return data || []
}

export async function createCategory(payload) {
  const { data, error } = await supabase
    .from(TABLES.resourceCategories)
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '新建分类失败'))
  return data
}

export async function updateCategory(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.resourceCategories)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存分类失败'))
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase.from(TABLES.resourceCategories).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除分类失败'))
}

/** 每个分类下的资源数量 */
export async function categoryCounts() {
  const { data, error } = await supabase.from(TABLES.resources).select('category_id')
  if (error) throw new Error(errorMessage(error, '统计分类失败'))
  const map = {}
  for (const row of data || []) {
    const key = row.category_id || 'uncategorized'
    map[key] = (map[key] || 0) + 1
  }
  return map
}

// ---------------------------------------------------------------------------
// 资源列表
// ---------------------------------------------------------------------------
const RESOURCE_SELECT = `
  id, title, description, file_name, file_path, file_size, mime_type, file_type,
  version, tags, visibility, download_count, created_at, updated_at,
  category_id, course_id,
  category:resource_categories(id, name, color, icon),
  course:courses(id, title),
  uploader:profiles(id, full_name)
`

export async function listResources(params = {}) {
  const {
    keyword = '',
    categoryId = '',
    courseId = '',
    fileType = '',
    sort = 'newest',
    page = 1,
    pageSize = 24,
  } = params

  let query = supabase.from(TABLES.resources).select(RESOURCE_SELECT, { count: 'exact' })

  const kw = clean(keyword)
  if (kw) query = query.or(`title.ilike.%${kw}%,file_name.ilike.%${kw}%,description.ilike.%${kw}%`)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (courseId) query = query.eq('course_id', courseId)
  if (fileType) query = query.eq('file_type', fileType)

  if (sort === 'popular') {
    query = query.order('download_count', { ascending: false })
  } else if (sort === 'name') {
    query = query.order('title', { ascending: true })
  } else if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const from = (Math.max(1, page) - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载资源列表失败'))
  return { items: data || [], total: count ?? 0 }
}

export async function getResource(id) {
  const { data, error } = await supabase
    .from(TABLES.resources)
    .select(RESOURCE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载资源失败'))
  return data
}

/**
 * 上传文件并写入资源表
 * @param {File} file
 * @param {object} meta { title, description, category_id, course_id, version, tags, visibility }
 * @param {function} onProgress 0-100 进度回调（浏览器不支持精确进度时不会触发）
 */
export async function uploadResource(file, meta = {}, onProgress) {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id ?? 'anonymous'
  const path = `${uid}/${safeStoragePath(file.name)}`

  onProgress?.(8)

  const { error: upErr } = await supabase.storage.from(BUCKETS.resources).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw new Error(errorMessage(upErr, '文件上传失败'))

  onProgress?.(78)

  const row = {
    title: meta.title?.trim() || file.name.replace(/\.[^.]+$/, ''),
    description: meta.description || null,
    category_id: meta.category_id || null,
    course_id: meta.course_id || null,
    bucket: BUCKETS.resources,
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || null,
    file_type: meta.file_type || detectFileKind(file.name, file.type || ''),
    version: meta.version || null,
    tags: meta.tags || [],
    visibility: meta.visibility || 'internal',
    uploaded_by: uid,
  }

  const { data, error } = await supabase.from(TABLES.resources).insert(row).select().single()
  if (error) {
    // 回滚已上传的文件，避免产生孤儿对象
    await supabase.storage.from(BUCKETS.resources).remove([path])
    throw new Error(errorMessage(error, '资源信息保存失败'))
  }
  onProgress?.(100)
  return data
}

export async function updateResource(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.resources)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存资源失败'))
  return data
}

/** 替换文件内容（保留资源记录，仅换存储对象） */
export async function replaceResourceFile(resource, file) {
  const uid = resource.uploaded_by || (await supabase.auth.getUser()).data?.user?.id || 'anonymous'
  const path = `${uid}/${safeStoragePath(file.name)}`

  const { error: upErr } = await supabase.storage.from(BUCKETS.resources).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw new Error(errorMessage(upErr, '文件上传失败'))

  const oldPath = resource.file_path
  const { data, error } = await supabase
    .from(TABLES.resources)
    .update({
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      file_type: detectFileKind(file.name, file.type || ''),
    })
    .eq('id', resource.id)
    .select()
    .single()

  if (error) {
    await supabase.storage.from(BUCKETS.resources).remove([path])
    throw new Error(errorMessage(error, '更新资源失败'))
  }
  if (oldPath) await supabase.storage.from(BUCKETS.resources).remove([oldPath])
  return data
}

export async function deleteResource(resource) {
  const { error } = await supabase.from(TABLES.resources).delete().eq('id', resource.id)
  if (error) throw new Error(errorMessage(error, '删除资源失败'))
  if (resource.file_path) {
    await supabase.storage.from(BUCKETS.resources).remove([resource.file_path])
  }
}

/**
 * 生成限时下载链接并登记下载记录
 * resource 桶为私有桶，下载地址有效期 5 分钟
 */
export async function downloadResource(resource) {
  const { data, error } = await supabase.storage
    .from(resource.bucket || BUCKETS.resources)
    .createSignedUrl(resource.file_path, 300, { download: resource.file_name })
  if (error) throw new Error(errorMessage(error, '生成下载链接失败'))

  // 记录下载次数（失败不阻断下载）
  supabase.rpc('register_download', { p_resource_id: resource.id }).then(() => {})

  return data.signedUrl
}

/** 预览链接（内联显示，不强制下载） */
export async function previewUrl(resource) {
  const { data, error } = await supabase.storage
    .from(resource.bucket || BUCKETS.resources)
    .createSignedUrl(resource.file_path, 300)
  if (error) throw new Error(errorMessage(error, '生成预览链接失败'))
  return data.signedUrl
}

/** 下载排行 */
export async function topResources(limit = 6) {
  const { data, error } = await supabase
    .from(TABLES.resources)
    .select(RESOURCE_SELECT)
    .order('download_count', { ascending: false })
    .limit(limit)
  if (error) throw new Error(errorMessage(error, '加载资源排行失败'))
  return data || []
}

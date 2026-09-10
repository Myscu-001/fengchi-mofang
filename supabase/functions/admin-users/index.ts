// =============================================================================
// 风驰思维魔方 · 管理员账号服务
// -----------------------------------------------------------------------------
// 为什么需要它：创建 / 删除 Auth 用户必须使用 service_role 密钥，而该密钥绝不能
// 出现在浏览器端。因此把这类高权限操作收敛到这个函数里，函数内部先校验调用者
// 是否具备 user.manage 权限，再以 service_role 身份调用 Supabase Auth 管理接口。
//
// 支持的操作：
//   { action: 'create',         email, password, full_name, role_code, phone, title }
//   { action: 'reset-password', user_id, password }
//   { action: 'delete',         user_id }
//
// 环境变量由 Supabase 平台自动注入，无需手动配置。
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''

const DEFAULT_ALLOWED_HEADERS =
  'authorization, x-client-info, apikey, content-type, x-supabase-api-version'

/**
 * 按请求动态生成 CORS 头。
 * 注意：supabase-js 会带上 x-supabase-api-version 等自定义头，如果白名单里没有，
 * 浏览器的预检请求会直接失败（表现为「操作失败，请稍后重试」）。
 * 这里直接回显浏览器声明的 Access-Control-Request-Headers，避免以后新增头再踩坑。
 */
function corsHeaders(req: Request): Record<string, string> {
  const requested = req.headers.get('Access-Control-Request-Headers')
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': requested || DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Access-Control-Request-Headers',
  }
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function parseMaybeJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** 用调用者自己的 JWT 换取用户身份 */
async function getCaller(token: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY || SERVICE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  return data?.id ? { id: data.id } : null
}

/** 以 service_role 访问 PostgREST（绕过 RLS，用于鉴权与资料维护） */
async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, data: parseMaybeJson(text) }
}

/** 校验调用者是否拥有 user.manage 权限 */
async function assertCanManageUsers(userId: string): Promise<{ ok: true; role: string } | { ok: false; reason: string }> {
  const profileRes = await rest(`profiles?id=eq.${userId}&select=role_code,status`)
  const profile = Array.isArray(profileRes.data) ? profileRes.data[0] : null
  if (!profileRes.ok || !profile) return { ok: false, reason: '账号资料不存在，请联系系统维护人员' }
  if (profile.status !== 'active') return { ok: false, reason: '当前账号已被停用' }

  const permRes = await rest(
    `role_permissions?role_code=eq.${encodeURIComponent(profile.role_code)}&permission_code=eq.user.manage&select=permission_code`,
  )
  if (!permRes.ok || !Array.isArray(permRes.data) || permRes.data.length === 0) {
    return { ok: false, reason: '当前角色没有账号管理权限' }
  }
  return { ok: true, role: profile.role_code }
}

/** 调用 Supabase Auth 管理接口 */
async function authAdmin(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, data: parseMaybeJson(text) }
}

function pickError(data: any, fallback: string): string {
  if (!data) return fallback
  if (typeof data === 'string') return data
  return (
    data.msg ||
    data.message ||
    data.error_description ||
    data.error ||
    (Array.isArray(data.errors) && data.errors[0]?.message) ||
    fallback
  )
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: '仅支持 POST 请求' }, 405)

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(req, { error: '服务未正确配置（缺少环境变量）' }, 500)
  }

  try {
    const raw = req.headers.get('Authorization') ?? ''
    const token = raw.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json(req, { error: '缺少登录凭证' }, 401)

    const caller = await getCaller(token)
    if (!caller) return json(req, { error: '登录状态已失效，请重新登录' }, 401)

    const guard = await assertCanManageUsers(caller.id)
    if (!guard.ok) return json(req, { error: guard.reason }, 403)

    const body = await req.json().catch(() => ({} as any))
    const action = String(body?.action ?? '')

    // -------------------------------------------------------------------------
    // 开通账号
    // -------------------------------------------------------------------------
    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const fullName = String(body.full_name ?? '').trim()
      const roleCode = String(body.role_code ?? 'teacher')

      if (!email || !email.includes('@')) return json(req, { error: '请填写有效的登录邮箱' }, 400)
      if (password.length < 8) return json(req, { error: '密码长度至少 8 位' }, 400)

      const roleCheck = await rest(`roles?code=eq.${encodeURIComponent(roleCode)}&select=code`)
      if (!roleCheck.ok || !Array.isArray(roleCheck.data) || roleCheck.data.length === 0) {
        return json(req, { error: `角色 ${roleCode} 不存在` }, 400)
      }

      const created = await authAdmin('users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role_code: roleCode,
            full_name: fullName || email.split('@')[0],
            phone: body.phone ? String(body.phone) : null,
            title: body.title ? String(body.title) : null,
            must_change_password: body.must_change_password !== false,
            created_by: caller.id,
          },
        }),
      })

      if (!created.ok) {
        const message = pickError(created.data, '创建账号失败')
        const duplicated = created.status === 422 || /already|exists|registered/i.test(message)
        return json(req, { error: duplicated ? '该邮箱已被使用，请更换或先到列表中查找' : message }, 400)
      }

      return json(req, {
        ok: true,
        user: { id: created.data?.id, email: created.data?.email },
      })
    }

    // -------------------------------------------------------------------------
    // 重置密码
    // -------------------------------------------------------------------------
    if (action === 'reset-password') {
      const userId = String(body.user_id ?? '')
      const password = String(body.password ?? '')
      if (!userId) return json(req, { error: '缺少用户 ID' }, 400)
      if (password.length < 8) return json(req, { error: '密码长度至少 8 位' }, 400)

      const updated = await authAdmin(`users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          password,
          user_metadata: { must_change_password: true },
        }),
      })
      if (!updated.ok) return json(req, { error: pickError(updated.data, '重置密码失败') }, 400)

      await rest(`profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ must_change_password: true }),
      })

      return json(req, { ok: true })
    }

    // -------------------------------------------------------------------------
    // 删除账号
    // -------------------------------------------------------------------------
    if (action === 'delete') {
      const userId = String(body.user_id ?? '')
      if (!userId) return json(req, { error: '缺少用户 ID' }, 400)
      if (userId === caller.id) return json(req, { error: '不能删除自己的账号' }, 400)

      const removed = await authAdmin(`users/${userId}`, { method: 'DELETE' })
      if (!removed.ok) return json(req, { error: pickError(removed.data, '删除账号失败') }, 400)
      return json(req, { ok: true })
    }

    return json(req, { error: `未知操作：${action || '(空)'}` }, 400)
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : '服务内部异常' }, 500)
  }
})

/**
 * 操作审计日志（写入端）。
 *
 * 设计原则：**尽力而为、绝不影响主流程**。
 * - 写入失败（例如审计表尚未创建、无网络、无权限）会被静默忽略，不阻塞用户的正常操作；
 * - 不在前端弹任何提示，避免干扰。
 *
 * 依赖 supabase/09_audit_logs.sql 创建审计表；未执行该脚本时本模块等价于空操作。
 */
import { supabase, TABLES } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

/**
 * 记录一条操作日志（不阻塞调用方）
 * @param {object} entry
 * @param {string} entry.action      动作：create / update / delete / upload / link / login ...
 * @param {string} entry.targetType  对象类型：score / resource / student / account / settings / goal ...
 * @param {string} [entry.targetId]  对象 ID
 * @param {string} entry.summary     一句话描述，例：修改 张小明 的三阶成绩
 * @param {object} [entry.detail]    附加信息（如改动前后）
 */
export function recordAudit(entry) {
  try {
    const auth = useAuthStore()
    const row = {
      actor_id: auth.user?.id ?? null,
      actor_name: auth.displayName || auth.user?.email || null,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId != null ? String(entry.targetId) : null,
      summary: entry.summary,
      detail: entry.detail || null,
    }
    // fire-and-forget：不 await，不抛出
    supabase
      .from(TABLES.auditLogs)
      .insert(row)
      .then(() => {})
      .catch(() => {})
  } catch {
    // 审计失败必须静默
  }
}

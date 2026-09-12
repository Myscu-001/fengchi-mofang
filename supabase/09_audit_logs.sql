-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  09 操作审计日志
-- 作用：记录「谁在什么时候对什么数据做了什么」，用于多人协作时的追溯。
-- 可重复执行（幂等）。
--
-- 注意：前端写入采用「尽力而为」策略——表未创建时写入会被忽略，不影响其它功能。
--       执行本脚本后，「系统管理 → 操作日志」页面即可看到记录。
-- =============================================================================

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,                                   -- 冗余记录操作人姓名，避免账号删除后无法辨认
  action      text not null,                          -- create / update / delete / upload / link / login ...
  target_type text not null,                          -- score / resource / student / account / settings / goal ...
  target_id   text,
  summary     text not null,                          -- 一句话描述
  detail      jsonb,                                  -- 附加信息（改动前后等）
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_target on public.audit_logs (target_type, target_id);
create index if not exists idx_audit_actor on public.audit_logs (actor_id);
create index if not exists idx_audit_action on public.audit_logs (action);

-- -----------------------------------------------------------------------------
-- 行级安全
-- -----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

-- 查看：仅超级管理员
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select to authenticated using (public.has_perm('user.manage'));

-- 写入：任意启用状态的机构人员（保证老师/助教的操作也能被记录）
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert to authenticated with check (public.is_active_staff());

-- 删除（清理）：仅超级管理员
drop policy if exists audit_delete on public.audit_logs;
create policy audit_delete on public.audit_logs
  for delete to authenticated using (public.has_perm('user.manage'));

-- 不允许修改已有日志（日志一经写入即不可篡改）
-- （未创建 update 策略，故 update 一律被拒绝）

-- -----------------------------------------------------------------------------
-- 权限授予
-- -----------------------------------------------------------------------------
grant select, insert, delete on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

-- =============================================================================
-- 风驰思维魔方 · 一次性建表脚本（把 09 / 10 / 11 合并在一起）
-- 用法：整段复制到 Supabase 后台的 SQL 编辑器，点 Run 即可。
-- 三个脚本都是幂等的，重复执行不会报错、不会影响已有数据。
-- =============================================================================


-- ===== 以下来自 09_audit_logs.sql（操作审计日志） =====

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

-- ===== 以下来自 10_student_learning_logs.sql（学员学习记录） =====

-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  10 学员学习记录
-- 作用：老师在学员档案里记录"今天学了什么 / 新学了哪个魔方"，形成学习时间轴。
-- 可重复执行（幂等）。
--
-- 说明：与 09_audit_logs.sql 一样，需要手动在本项目 Supabase 后台的 SQL 编辑器执行一次。
--       未执行时前端会给出明确提示，不影响其它功能。
-- =============================================================================

create table if not exists public.student_learning_logs (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  learned_on date not null default current_date,          -- 学习日期
  project    text,                                        -- 可选：关联的魔方项目（2x2/3x3/...）
  content    text not null,                               -- 学习内容（自由文本）
  tags       text[] not null default '{}',                -- 可选标签
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sll_student on public.student_learning_logs (student_id, learned_on desc);
create index if not exists idx_sll_project on public.student_learning_logs (project);

-- 更新时间触发器（与其它表一致）
drop trigger if exists trg_student_learning_logs_updated on public.student_learning_logs;
create trigger trg_student_learning_logs_updated
  before update on public.student_learning_logs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 行级安全
-- -----------------------------------------------------------------------------
alter table public.student_learning_logs enable row level security;

-- 查看：具备「查看学员」权限即可
drop policy if exists sll_select on public.student_learning_logs;
create policy sll_select on public.student_learning_logs
  for select to authenticated using (public.has_perm('student.view'));

-- 维护（增改删）：具备「编辑学员」权限（机构老师 / 超级管理员）
drop policy if exists sll_manage on public.student_learning_logs;
create policy sll_manage on public.student_learning_logs
  for all to authenticated
  using (public.has_perm('student.manage'))
  with check (public.has_perm('student.manage'));

-- -----------------------------------------------------------------------------
-- 权限授予
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.student_learning_logs to authenticated;
grant all on public.student_learning_logs to service_role;

-- ===== 以下来自 11_cfop_progress.sql（CFOP 学习进度） =====

-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  11 CFOP 学习进度
-- 作用：记录「某学员已掌握哪些 CFOP 情况」以及「是哪一天学的」
--       （F2L 41 / OLL 57 / PLL 21，共 119）。
-- 可重复执行（幂等）。
--
-- 说明：图案本身存在 site_settings 的 `cfop.patterns`（全局共享，仅超管可改），
--       本表只存每个学员的掌握情况，一行一个学员。
--       learned 结构：{ "oll:12": "2026-09-15", "pll:3": "2026-09-10", ... }
-- =============================================================================

create table if not exists public.cfop_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  learned    jsonb not null default '{}'::jsonb,   -- { "情况key": "YYYY-MM-DD" }
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 兼容早期版本（若已按旧结构建过表，这里补上新列；旧列不影响使用）
alter table public.cfop_progress add column if not exists learned jsonb not null default '{}'::jsonb;

create index if not exists idx_cfop_progress_updated on public.cfop_progress (updated_at desc);

-- 更新时间触发器（与其它表一致）
drop trigger if exists trg_cfop_progress_updated on public.cfop_progress;
create trigger trg_cfop_progress_updated
  before update on public.cfop_progress
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 行级安全
-- -----------------------------------------------------------------------------
alter table public.cfop_progress enable row level security;

-- 查看：具备「查看学员」权限
drop policy if exists cfop_progress_select on public.cfop_progress;
create policy cfop_progress_select on public.cfop_progress
  for select to authenticated using (public.has_perm('student.view'));

-- 维护（勾选 / 改日期）：具备「编辑学员」权限（机构老师 / 超级管理员）
drop policy if exists cfop_progress_manage on public.cfop_progress;
create policy cfop_progress_manage on public.cfop_progress
  for all to authenticated
  using (public.has_perm('student.manage'))
  with check (public.has_perm('student.manage'));

-- -----------------------------------------------------------------------------
-- 权限授予
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.cfop_progress to authenticated;
grant all on public.cfop_progress to service_role;

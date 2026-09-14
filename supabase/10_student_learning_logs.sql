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

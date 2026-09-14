-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  11 CFOP 学习进度
-- 作用：记录「某学员已掌握哪些 CFOP 情况」（F2L 41 / OLL 57 / PLL 21，共 119）。
-- 可重复执行（幂等）。
--
-- 说明：图案本身存在 site_settings 的 `cfop.patterns`（全局共享，仅超管可改），
--       本表只存「哪些情况已勾选」，按学员一行。
-- =============================================================================

create table if not exists public.cfop_progress (
  student_id   uuid primary key references public.students(id) on delete cascade,
  learned_keys text[] not null default '{}',   -- 形如 {oll:12,pll:3,f2l:1}
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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

-- 维护（勾选/取消）：具备「编辑学员」权限（机构老师 / 超级管理员）
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

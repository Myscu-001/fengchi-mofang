-- =============================================================================
-- 风驰思维魔方 · 08 魔方成绩表（按学员 + 魔方项目记录复原成绩）
-- 参考 PRD：魔方项目独立存储，支持简单模式（直接录入）与详细模式（5 次 Ao5 + DNF）。
-- 可重复执行。
-- =============================================================================

-- 魔方项目枚举
do $$ begin
  create type public.cube_project as enum ('2x2', '3x3', '4x4', '5x5', 'pyraminx', 'skewb');
exception when duplicate_object then null; end $$;

-- 成绩记录
create table if not exists public.student_scores (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  project             public.cube_project not null,
  recorded_at         date not null default current_date,
  mode                text not null default 'detail' check (mode in ('simple', 'detail')),
  avg_seconds         numeric(8, 3),          -- 平均成绩（秒），DNF 时为 null
  avg_is_dnf          boolean not null default false,
  single_best_seconds numeric(8, 3),          -- 单次最佳（秒），DNF 时为 null
  single_is_dnf       boolean not null default false,
  attempts            jsonb,                  -- 详细模式：[{ value: number|null, is_dnf: bool }] ×5
  note                text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_scores_student on public.student_scores (student_id, project, recorded_at desc);
create index if not exists idx_scores_created on public.student_scores (created_at desc);

-- 行级安全
alter table public.student_scores enable row level security;

drop policy if exists scores_select on public.student_scores;
create policy scores_select on public.student_scores
  for select to authenticated using (public.has_perm('score.view'));

drop policy if exists scores_manage on public.student_scores;
create policy scores_manage on public.student_scores
  for all to authenticated
  using (public.has_perm('score.manage'))
  with check (public.has_perm('score.manage'));

-- 更新时间触发器
drop trigger if exists trg_student_scores_updated on public.student_scores;
create trigger trg_student_scores_updated
  before update on public.student_scores
  for each row execute function public.set_updated_at();

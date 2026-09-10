-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  01 基础结构
-- 说明：本文件可重复执行（幂等）。建议按 01 → 02 → 03 → 04 顺序执行。
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- 枚举类型
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.course_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.student_status as enum ('active', 'paused', 'graduated', 'left');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.class_status as enum ('planning', 'active', 'finished', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assessment_type as enum ('quiz', 'stage', 'competition', 'practice');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_kind as enum ('document', 'pdf', 'sheet', 'slide', 'image', 'video', 'archive', 'other');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 角色 / 权限（RBAC）
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  code        text primary key,
  name        text not null,
  description text,
  level       int  not null default 10,       -- 数值越大权限层级越高
  is_system   boolean not null default false, -- 系统内置角色不可删除
  created_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  code        text primary key,
  name        text not null,
  module      text not null,
  description text,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_code       text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (role_code, permission_code)
);

-- -----------------------------------------------------------------------------
-- 用户资料（对应 auth.users 的 1:1 扩展表）
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  full_name            text not null default '',
  phone                text,
  avatar_url           text,
  role_code            text not null default 'teacher' references public.roles(code) on update cascade,
  status               text not null default 'active' check (status in ('active', 'disabled')),
  title                text,                              -- 职务，如「金牌教练」
  bio                  text,
  must_change_password boolean not null default true,     -- 管理员开通的账号首次登录需改密
  last_login_at        timestamptz,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists uq_profiles_email on public.profiles (lower(email)) where email is not null;
create index if not exists idx_profiles_role on public.profiles (role_code);
create index if not exists idx_profiles_status on public.profiles (status);

-- -----------------------------------------------------------------------------
-- 课程
-- -----------------------------------------------------------------------------
create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  subtitle       text,
  slug           text,
  cover_url      text,
  summary        text,                                   -- 一句话简介
  description    text,                                   -- 详细介绍（富文本/多段）
  category       text,                                   -- 课程分类：启蒙 / 入门 / 进阶 / 提速 / 赛事 / 盲拧 …
  track          text,                                   -- 课程线：魔方 / 桌游
  level          smallint not null default 1 check (level between 1 and 5),
  stage          text,                                   -- 适用阶段：幼儿 / 小学低年级 / 小学高年级 / 青少年
  age_range      text,                                   -- 适龄区间，如 5-7岁
  goal           text,                                   -- 课程目标
  learning_outcomes text[] not null default '{}',        -- 学习收获（能力培养点）
  total_lessons  int not null default 0,
  lesson_minutes int not null default 45,
  price          numeric(10, 2) not null default 0,
  tags           text[] not null default '{}',
  status         public.course_status not null default 'draft',
  sort_order     int not null default 100,
  published_at   timestamptz,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists uq_courses_slug on public.courses (slug) where slug is not null;
create index if not exists idx_courses_status on public.courses (status);
create index if not exists idx_courses_category on public.courses (category);
create index if not exists idx_courses_sort on public.courses (sort_order, created_at desc);

-- 课时 / 教案
create table if not exists public.course_lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  title            text not null,
  goal             text,                                  -- 教学目标
  content          text,                                  -- 教学内容 / 教案
  formula          text,                                  -- 核心公式、口诀
  homework         text,                                  -- 课后练习
  order_index      int not null default 1,
  duration_minutes int not null default 45,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_lessons_course on public.course_lessons (course_id, order_index);

-- -----------------------------------------------------------------------------
-- 学员
-- -----------------------------------------------------------------------------
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  nickname       text,
  gender         text not null default 'unknown' check (gender in ('male', 'female', 'unknown')),
  birthday       date,
  phone          text,
  guardian_name  text,                                    -- 家长姓名
  guardian_phone text,
  school         text,
  grade          text,
  level          text,                                    -- 当前水平：新手 / 入门 / 熟练 / 竞速
  source         text,                                    -- 来源渠道
  avatar_url     text,
  joined_at      date not null default current_date,
  status         public.student_status not null default 'active',
  notes          text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_students_name on public.students (name);
create index if not exists idx_students_status on public.students (status);
create index if not exists idx_students_joined on public.students (joined_at desc);

-- -----------------------------------------------------------------------------
-- 班级 / 开班
-- -----------------------------------------------------------------------------
create table if not exists public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  course_id     uuid references public.courses(id) on delete set null,
  teacher_id    uuid references public.profiles(id) on delete set null,
  room          text,
  weekday       smallint check (weekday between 1 and 7),  -- 1=周一
  start_time    time,
  end_time      time,
  start_date    date,
  end_date      date,
  capacity      int not null default 8,
  status        public.class_status not null default 'planning',
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_classes_course on public.classes (course_id);
create index if not exists idx_classes_teacher on public.classes (teacher_id);
create index if not exists idx_classes_status on public.classes (status);

create table if not exists public.class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  joined_at  date not null default current_date,
  status     text not null default 'active' check (status in ('active', 'left')),
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);
create index if not exists idx_class_members_student on public.class_members (student_id);

-- -----------------------------------------------------------------------------
-- 测评 / 成绩
-- -----------------------------------------------------------------------------
create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  course_id   uuid references public.courses(id) on delete set null,
  class_id    uuid references public.classes(id) on delete set null,
  type        public.assessment_type not null default 'stage',
  max_score   numeric(6, 2) not null default 100,
  pass_score  numeric(6, 2),
  assessed_at date not null default current_date,
  description text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_assessments_course on public.assessments (course_id);
create index if not exists idx_assessments_date on public.assessments (assessed_at desc);

create table if not exists public.grades (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  score         numeric(6, 2),
  duration_ms   int,                                      -- 三阶复原耗时（毫秒）
  rank          int,
  level         text,                                     -- 评定等级 A / B / C
  is_pass       boolean,
  comment       text,
  recorded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index if not exists idx_grades_student on public.grades (student_id);
create index if not exists idx_grades_assessment on public.grades (assessment_id);

-- -----------------------------------------------------------------------------
-- 资源分类 / 资源文件
-- -----------------------------------------------------------------------------
create table if not exists public.resource_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text,
  parent_id   uuid references public.resource_categories(id) on delete cascade,
  icon        text,
  color       text default '#3366ff',
  description text,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists uq_resource_categories_slug on public.resource_categories (slug) where slug is not null;
create index if not exists idx_res_cat_parent on public.resource_categories (parent_id, sort_order);

create table if not exists public.resources (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  category_id    uuid references public.resource_categories(id) on delete set null,
  course_id      uuid references public.courses(id) on delete set null,
  bucket         text not null default 'resources',
  file_path      text not null,                            -- Storage 内的对象路径
  file_name      text not null,
  file_size      bigint not null default 0,
  mime_type      text,
  file_type      public.file_kind not null default 'other',
  version        text,                                     -- 版本，如 v1.2
  tags           text[] not null default '{}',
  visibility     text not null default 'internal' check (visibility in ('internal', 'public')),
  download_count int not null default 0,
  uploaded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_resources_category on public.resources (category_id);
create index if not exists idx_resources_course on public.resources (course_id);
create index if not exists idx_resources_created on public.resources (created_at desc);
create index if not exists idx_resources_name on public.resources (file_name);

create table if not exists public.resource_downloads (
  id          bigserial primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_res_dl_resource on public.resource_downloads (resource_id);
create index if not exists idx_res_dl_created on public.resource_downloads (created_at desc);

-- -----------------------------------------------------------------------------
-- 师资团队
-- 说明：师资是「对外展示的教练团队」，与系统登录账号（profiles）刻意分离——
--       教练不一定需要使用本系统，不应为了展示而建立登录账号。
-- -----------------------------------------------------------------------------
create table if not exists public.coaches (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  title          text,                                    -- 职务 / 头衔，如「竞速教练」
  years_competing text,                                   -- 竞技生涯，如「9 年」
  years_teaching  text,                                   -- 教学经验，如「7 年」
  avg_time       text,                                    -- 三阶平均成绩，如「9s」
  highlights     text[] not null default '{}',             -- 荣誉 / 专长条目
  bio            text,
  avatar_url     text,
  sort_order     int not null default 100,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_coaches_sort on public.coaches (sort_order, created_at);
create index if not exists idx_coaches_active on public.coaches (is_active);

-- -----------------------------------------------------------------------------
-- 站点配置（首页文案、联系方式等 key-value）
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- =============================================================================
-- 增量字段（对已经建好的库补列，幂等；新库执行上面的 create table 时已包含）
-- =============================================================================
alter table public.courses add column if not exists track text;
alter table public.courses add column if not exists learning_outcomes text[] not null default '{}';
create index if not exists idx_courses_track on public.courses (track);

-- =============================================================================
-- 函数
-- =============================================================================

-- 通用 updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 当前用户角色
create or replace function public.current_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role_code from public.profiles p
      where p.id = auth.uid() and p.status = 'active'),
    'guest'
  );
$$;

-- 当前用户是否为启用状态的机构人员
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  );
$$;

-- 权限判定
create or replace function public.has_perm(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_code = p.role_code
    where p.id = auth.uid()
      and p.status = 'active'
      and rp.permission_code = perm
  );
$$;

-- 是否为超级管理员（拥有 user.manage 权限）
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_perm('user.manage');
$$;

-- 新建 auth 用户时自动建立资料行
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_created_by uuid;
begin
  v_role := coalesce(nullif(new.raw_user_meta_data ->> 'role_code', ''), 'teacher');
  if not exists (select 1 from public.roles where code = v_role) then
    v_role := 'teacher';
  end if;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  begin
    v_created_by := nullif(new.raw_user_meta_data ->> 'created_by', '')::uuid;
  exception when others then
    v_created_by := null;
  end;

  -- created_by 外键指向 profiles，需确认该档案已存在
  if v_created_by is not null
     and not exists (select 1 from public.profiles where id = v_created_by) then
    v_created_by := null;
  end if;

  insert into public.profiles (id, email, full_name, phone, role_code, status, title, created_by, must_change_password)
  values (
    new.id,
    new.email,
    v_name,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_role,
    'active',
    nullif(new.raw_user_meta_data ->> 'title', ''),
    v_created_by,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  )
  on conflict (id) do update
    set email      = coalesce(excluded.email, public.profiles.email),
        full_name  = case when coalesce(public.profiles.full_name, '') = '' then excluded.full_name else public.profiles.full_name end,
        updated_at = now();

  return new;
end $$;

-- 禁止普通用户自行提权
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claims text;
begin
  -- 非 PostgREST 上下文（SQL 编辑器、迁移、service_role）直接放行
  v_claims := coalesce(current_setting('request.jwt.claims', true), '');
  if v_claims = '' then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  if new.role_code is distinct from old.role_code
     or new.status is distinct from old.status
     or new.created_by is distinct from old.created_by then
    raise exception '仅超级管理员可以修改角色或账号状态' using errcode = '42501';
  end if;

  return new;
end $$;

-- 下载计数 + 日志
create or replace function public.register_download(p_resource_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_staff() then
    raise exception '无权访问' using errcode = '42501';
  end if;

  update public.resources
     set download_count = download_count + 1
   where id = p_resource_id;

  insert into public.resource_downloads (resource_id, user_id)
  values (p_resource_id, auth.uid());
end $$;

-- 生成 slug
create or replace function public.slugify(txt text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9\u4e00-\u9fa5]+', '-', 'g'));
$$;

-- =============================================================================
-- 触发器
-- =============================================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'courses', 'course_lessons', 'students', 'classes',
    'assessments', 'grades', 'resource_categories', 'resources', 'coaches'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- =============================================================================
-- 视图
-- =============================================================================
-- 说明：用 drop + create 而非 create or replace，因为要调整列的顺序
-- （create or replace 只允许在末尾追加列）。
drop view if exists public.v_course_overview;
create view public.v_course_overview as
select
  c.id,
  c.title,
  c.subtitle,
  c.slug,
  c.cover_url,
  c.summary,
  c.track,
  c.category,
  c.level,
  c.stage,
  c.age_range,
  c.goal,
  c.learning_outcomes,
  c.lesson_minutes,
  c.price,
  c.status,
  c.sort_order,
  c.tags,
  c.created_at,
  c.updated_at,
  coalesce(l.lesson_count, 0)  as lesson_count,
  coalesce(s.student_count, 0) as student_count,
  coalesce(r.resource_count, 0) as resource_count
from public.courses c
left join (
  select course_id, count(*)::int as lesson_count
    from public.course_lessons group by course_id
) l on l.course_id = c.id
left join (
  select co.id as course_id, count(distinct cm.student_id)::int as student_count
    from public.classes co
    join public.class_members cm on cm.class_id = co.id and cm.status = 'active'
   group by co.id
) s on s.course_id = c.id
left join (
  select course_id, count(*)::int as resource_count
    from public.resources group by course_id
) r on r.course_id = c.id;

create or replace view public.v_student_grade as
select
  g.id,
  g.assessment_id,
  g.student_id,
  st.name       as student_name,
  st.level      as student_level,
  a.title       as assessment_title,
  a.type        as assessment_type,
  a.max_score,
  a.assessed_at,
  a.course_id,
  c.title       as course_title,
  a.class_id,
  g.score,
  g.duration_ms,
  g.rank,
  g.level,
  g.is_pass,
  g.comment,
  g.recorded_by,
  g.created_at
from public.grades g
join public.students st    on st.id = g.student_id
join public.assessments a  on a.id = g.assessment_id
left join public.courses c on c.id = a.course_id;

-- 关键：PostgreSQL 15+ 视图默认以「定义者权限」执行，会绕过底层表的 RLS。
-- 必须切换为「调用者权限」，让视图继承访问者的行级安全策略。
alter view public.v_course_overview set (security_invoker = on);
alter view public.v_student_grade  set (security_invoker = on);

grant select on public.v_course_overview to authenticated;
grant select on public.v_student_grade  to authenticated;
grant select on public.v_course_overview to service_role;
grant select on public.v_student_grade  to service_role;

-- =============================================================================
-- 权限授予（RLS 仍然生效，这里只是补齐 grant）
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;

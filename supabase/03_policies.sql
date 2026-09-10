-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  03 行级安全策略与存储桶
-- 设计原则：
--   1. 所有业务数据默认仅对「启用状态的机构人员」开放；
--   2. 查看类权限与编辑类权限分离，助教可看不可改（成绩与资源除外）；
--   3. resource 桶为私有桶，下载需先取得带签名的临时 URL。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 开启 RLS
-- -----------------------------------------------------------------------------
alter table public.roles               enable row level security;
alter table public.permissions         enable row level security;
alter table public.role_permissions    enable row level security;
alter table public.profiles            enable row level security;
alter table public.courses             enable row level security;
alter table public.course_lessons      enable row level security;
alter table public.students            enable row level security;
alter table public.classes             enable row level security;
alter table public.class_members       enable row level security;
alter table public.assessments         enable row level security;
alter table public.grades              enable row level security;
alter table public.resource_categories enable row level security;
alter table public.resources           enable row level security;
alter table public.resource_downloads  enable row level security;
alter table public.coaches             enable row level security;
alter table public.site_settings       enable row level security;

-- -----------------------------------------------------------------------------
-- 角色 / 权限
-- -----------------------------------------------------------------------------
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated using (public.is_active_staff());

drop policy if exists roles_manage on public.roles;
create policy roles_manage on public.roles
  for all to authenticated
  using (public.has_perm('role.manage'))
  with check (public.has_perm('role.manage'));

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select to authenticated using (public.is_active_staff());

drop policy if exists permissions_manage on public.permissions;
create policy permissions_manage on public.permissions
  for all to authenticated
  using (public.has_perm('role.manage'))
  with check (public.has_perm('role.manage'));

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (public.is_active_staff());

drop policy if exists role_permissions_manage on public.role_permissions;
create policy role_permissions_manage on public.role_permissions
  for all to authenticated
  using (public.has_perm('role.manage'))
  with check (public.has_perm('role.manage'));

-- -----------------------------------------------------------------------------
-- 用户资料
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_active_staff());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.has_perm('user.manage'));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_perm('user.manage'))
  with check (id = auth.uid() or public.has_perm('user.manage'));

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.has_perm('user.manage') and id <> auth.uid());

-- -----------------------------------------------------------------------------
-- 课程 / 课时
-- -----------------------------------------------------------------------------
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
  for select to authenticated using (public.has_perm('course.view'));

drop policy if exists courses_manage on public.courses;
create policy courses_manage on public.courses
  for all to authenticated
  using (public.has_perm('course.manage'))
  with check (public.has_perm('course.manage'));

drop policy if exists lessons_select on public.course_lessons;
create policy lessons_select on public.course_lessons
  for select to authenticated using (public.has_perm('course.view'));

drop policy if exists lessons_manage on public.course_lessons;
create policy lessons_manage on public.course_lessons
  for all to authenticated
  using (public.has_perm('course.manage'))
  with check (public.has_perm('course.manage'));

-- -----------------------------------------------------------------------------
-- 学员
-- -----------------------------------------------------------------------------
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select to authenticated using (public.has_perm('student.view'));

drop policy if exists students_manage on public.students;
create policy students_manage on public.students
  for all to authenticated
  using (public.has_perm('student.manage'))
  with check (public.has_perm('student.manage'));

-- -----------------------------------------------------------------------------
-- 班级
-- -----------------------------------------------------------------------------
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated using (public.has_perm('class.view'));

drop policy if exists classes_manage on public.classes;
create policy classes_manage on public.classes
  for all to authenticated
  using (public.has_perm('class.manage'))
  with check (public.has_perm('class.manage'));

drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated using (public.has_perm('class.view'));

drop policy if exists class_members_manage on public.class_members;
create policy class_members_manage on public.class_members
  for all to authenticated
  using (public.has_perm('class.manage'))
  with check (public.has_perm('class.manage'));

-- -----------------------------------------------------------------------------
-- 测评 / 成绩
-- -----------------------------------------------------------------------------
drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
  for select to authenticated using (public.has_perm('grade.view'));

drop policy if exists assessments_manage on public.assessments;
create policy assessments_manage on public.assessments
  for all to authenticated
  using (public.has_perm('grade.manage'))
  with check (public.has_perm('grade.manage'));

drop policy if exists grades_select on public.grades;
create policy grades_select on public.grades
  for select to authenticated using (public.has_perm('grade.view'));

drop policy if exists grades_manage on public.grades;
create policy grades_manage on public.grades
  for all to authenticated
  using (public.has_perm('grade.manage'))
  with check (public.has_perm('grade.manage'));

-- -----------------------------------------------------------------------------
-- 资源
-- -----------------------------------------------------------------------------
drop policy if exists res_categories_select on public.resource_categories;
create policy res_categories_select on public.resource_categories
  for select to authenticated using (public.has_perm('resource.view'));

drop policy if exists res_categories_manage on public.resource_categories;
create policy res_categories_manage on public.resource_categories
  for all to authenticated
  using (public.has_perm('resource.manage'))
  with check (public.has_perm('resource.manage'));

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources
  for select to authenticated using (public.has_perm('resource.view'));

drop policy if exists resources_manage on public.resources;
create policy resources_manage on public.resources
  for all to authenticated
  using (public.has_perm('resource.manage'))
  with check (public.has_perm('resource.manage'));

drop policy if exists res_downloads_select on public.resource_downloads;
create policy res_downloads_select on public.resource_downloads
  for select to authenticated using (public.has_perm('resource.view'));
-- 写入仅通过 public.register_download() 这个 security definer 函数完成

-- -----------------------------------------------------------------------------
-- 师资团队（对外展示信息，未登录也可读；仅机构人员能看到停用中的教练）
-- -----------------------------------------------------------------------------
drop policy if exists coaches_select on public.coaches;
create policy coaches_select on public.coaches
  for select to anon, authenticated
  using (is_active = true or public.is_active_staff());

drop policy if exists coaches_manage on public.coaches;
create policy coaches_manage on public.coaches
  for all to authenticated
  using (public.has_perm('coach.manage'))
  with check (public.has_perm('coach.manage'));

-- -----------------------------------------------------------------------------
-- 站点配置（首页文案对外可读，便于未登录时展示品牌信息）
-- -----------------------------------------------------------------------------
drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists site_settings_manage on public.site_settings;
create policy site_settings_manage on public.site_settings
  for all to authenticated
  using (public.has_perm('settings.manage'))
  with check (public.has_perm('settings.manage'));

-- =============================================================================
-- 存储桶
-- =============================================================================
-- 注意：resources 桶的 50MB 与 Supabase 免费版 storage.max_file_size 一致。
-- 该项目级上限在免费版不可调整，桶级限制设得更高也没有意义，只会造成
-- 「前端放行、存储层报错」的不一致。升级付费计划后可同步放宽这两处。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers',    'covers',    true,  5242880,  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']),
  ('avatars',   'avatars',   true,  2097152,  array['image/png','image/jpeg','image/webp']),
  ('resources', 'resources', false, 52428800, null)
on conflict (id) do update
  set public          = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- covers：公开读取，具备课程编辑权限者可写
drop policy if exists covers_read on storage.objects;
create policy covers_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'covers');

drop policy if exists covers_insert on storage.objects;
create policy covers_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.has_perm('course.manage'));

drop policy if exists covers_update on storage.objects;
create policy covers_update on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and public.has_perm('course.manage'));

drop policy if exists covers_delete on storage.objects;
create policy covers_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and public.has_perm('course.manage'));

-- avatars：公开读取，用户仅能写自己的目录
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- resources：私有桶，具备资源查看权限者可读（用于生成签名 URL）
drop policy if exists resources_read on storage.objects;
create policy resources_read on storage.objects
  for select to authenticated
  using (bucket_id = 'resources' and public.has_perm('resource.view'));

drop policy if exists resources_insert on storage.objects;
create policy resources_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resources' and public.has_perm('resource.manage'));

drop policy if exists resources_update on storage.objects;
create policy resources_update on storage.objects
  for update to authenticated
  using (bucket_id = 'resources' and public.has_perm('resource.manage'));

drop policy if exists resources_delete on storage.objects;
create policy resources_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'resources' and public.has_perm('resource.manage'));

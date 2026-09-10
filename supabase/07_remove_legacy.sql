-- =============================================================================
-- 风驰思维魔方 · 07 清理遗留功能（开班管理 / 测评成绩）
-- 配合前端已移除对应页面，这里删除数据库中的遗留对象，并新增「魔方成绩」权限。
-- 可重复执行（全部使用 if exists 守卫）。
-- =============================================================================

-- 1. 先删依赖于遗留表的视图
drop view if exists public.v_student_grade;
drop view if exists public.v_course_overview;

-- 2. 删触发器
drop trigger if exists trg_class_members_updated on public.class_members;
drop trigger if exists trg_classes_updated on public.classes;
drop trigger if exists trg_assessments_updated on public.assessments;
drop trigger if exists trg_grades_updated on public.grades;

-- 3. 删表（注意外键顺序：子表先于父表）
drop table if exists public.class_members;
drop table if exists public.grades;
drop table if exists public.assessments;
drop table if exists public.classes;

-- 4. 删枚举
drop type if exists public.class_status;
drop type if exists public.assessment_type;

-- 5. 权限：移除 class.* / grade.*
delete from public.role_permissions where permission_code like 'class.%' or permission_code like 'grade.%';
delete from public.permissions where code like 'class.%' or code like 'grade.%';

-- 6. 新增 score.* 权限（魔方成绩）
insert into public.permissions (code, name, module, description, sort_order) values
  ('score.view',  '查看成绩', 'score', '浏览学员的魔方成绩记录',           400),
  ('score.manage', '录入成绩', 'score', '新增、修改、删除魔方成绩记录',   410)
on conflict (code) do nothing;

insert into public.role_permissions (role_code, permission_code) values
  ('admin',     'score.view'),
  ('admin',     'score.manage'),
  ('teacher',   'score.view'),
  ('teacher',   'score.manage'),
  ('assistant', 'score.view'),
  ('assistant', 'score.manage')
on conflict do nothing;

-- 7. 更新角色描述，去掉「班级 / 成绩」字眼
update public.roles set description = '日常教学管理：课程、学员、魔方成绩、资源' where code = 'teacher';
update public.roles set description = '辅助教学：查看课程学员、录入魔方成绩、上传资源' where code = 'assistant';

-- 8. 重建 v_course_overview（去掉依赖 classes 的 student_count）
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
  coalesce(l.lesson_count, 0)    as lesson_count,
  coalesce(r.resource_count, 0)  as resource_count
from public.courses c
left join (
  select course_id, count(*)::int as lesson_count
    from public.course_lessons group by course_id
) l on l.course_id = c.id
left join (
  select course_id, count(*)::int as resource_count
    from public.resources group by course_id
) r on r.course_id = c.id;

alter view public.v_course_overview set (security_invoker = on);
grant select on public.v_course_overview to authenticated;
grant select on public.v_course_overview to service_role;

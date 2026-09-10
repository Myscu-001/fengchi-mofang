-- =============================================================================
-- 风驰思维魔方 · 教学管理系统  02 角色权限与基础字典
-- 幂等：使用 on conflict do nothing，重复执行不会覆盖已有调整
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 角色
-- -----------------------------------------------------------------------------
insert into public.roles (code, name, description, level, is_system) values
  ('admin',     '超级管理员', '拥有全部权限，可管理账号、角色与站点配置', 100, true),
  ('teacher',   '机构老师',   '日常教学管理：课程、学员、班级、成绩、资源',  50, true),
  ('assistant', '助教',       '辅助教学：查看课程学员、录入成绩、上传资源',  20, true)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 权限点
-- -----------------------------------------------------------------------------
insert into public.permissions (code, name, module, description, sort_order) values
  ('user.manage',     '账号管理',     'system',   '创建/停用老师账号、重置密码、分配角色', 10),
  ('role.manage',     '角色权限配置', 'system',   '调整角色与权限点的对应关系',           20),
  ('settings.manage', '站点配置',     'system',   '维护首页文案与机构联系方式',           30),
  ('course.view',     '查看课程',     'course',   '浏览课程与课时教案',                   100),
  ('course.manage',   '编辑课程',     'course',   '新建、修改、上下架课程与课时',         110),
  ('student.view',    '查看学员',     'student',  '浏览学员档案',                         200),
  ('student.manage',  '编辑学员',     'student',  '新建、修改学员档案与状态',             210),
  ('class.view',      '查看班级',     'class',    '浏览开班与班级名单',                   300),
  ('class.manage',    '编辑班级',     'class',    '新建班级、调整排课与成员',             310),
  ('grade.view',      '查看成绩',     'grade',    '浏览测评与成绩记录',                   400),
  ('grade.manage',    '录入成绩',     'grade',    '创建测评、录入与修改成绩',             410),
  ('resource.view',   '查看资源',     'resource', '浏览与下载教学资源',                   500),
  ('resource.manage', '管理资源',     'resource', '上传、编辑、删除资源与分类',           510)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 角色 → 权限
-- -----------------------------------------------------------------------------
-- 超级管理员：全部权限
insert into public.role_permissions (role_code, permission_code)
select 'admin', code from public.permissions
on conflict do nothing;

-- 机构老师：教学全流程
insert into public.role_permissions (role_code, permission_code) values
  ('teacher', 'course.view'),
  ('teacher', 'course.manage'),
  ('teacher', 'student.view'),
  ('teacher', 'student.manage'),
  ('teacher', 'class.view'),
  ('teacher', 'class.manage'),
  ('teacher', 'grade.view'),
  ('teacher', 'grade.manage'),
  ('teacher', 'resource.view'),
  ('teacher', 'resource.manage')
on conflict do nothing;

-- 助教：可查看、可录入成绩、可上传资源
insert into public.role_permissions (role_code, permission_code) values
  ('assistant', 'course.view'),
  ('assistant', 'student.view'),
  ('assistant', 'class.view'),
  ('assistant', 'grade.view'),
  ('assistant', 'grade.manage'),
  ('assistant', 'resource.view'),
  ('assistant', 'resource.manage')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 资源分类（两级，可按需继续扩展）
-- -----------------------------------------------------------------------------
insert into public.resource_categories (name, slug, parent_id, icon, color, description, sort_order) values
  ('教学课件', 'courseware', null, 'Presentation', '#3366ff', '各阶段课程配套的课件与讲义', 10),
  ('教案教研', 'lesson-plan', null, 'NotebookPen', '#22c55e', '教案、教研资料、教学法总结', 20),
  ('公式图表', 'formula',    null, 'Grid3x3',      '#f97316', '公式表、指法图、色块对照图', 30),
  ('赛事资料', 'competition', null, 'Trophy',      '#facc15', '赛事规则、报名表、成绩公示模板', 40),
  ('音视频素材', 'media',    null, 'Video',        '#ef4444', '演示视频、课堂录音、背景音乐', 50),
  ('品牌物料', 'brand',      null, 'Palette',      '#8b5cf6', '机构 LOGO、海报、宣传单页', 60),
  ('其他资料', 'other',      null, 'FolderOpen',   '#64748b', '暂未归类的文件', 999)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 站点配置
-- -----------------------------------------------------------------------------
insert into public.site_settings (key, value, description) values
  (
    'site.brand',
    '{"name":"风驰思维魔方","full_name":"风驰思维魔方教育","slogan":"让每个孩子都用思维转动世界","logo_url":""}'::jsonb,
    '品牌名称与标语'
  ),
  (
    'site.contact',
    '{"phone":"","wechat":"","email":"","address":"","hours":"周一至周日 09:00 - 21:00"}'::jsonb,
    '机构联系方式'
  ),
  (
    'home.hero',
    '{"title":"风驰思维魔方","subtitle":"以魔方为载体，训练观察力、记忆力、空间想象力与专注力。我们不只是教会还原，更在意孩子思考的过程。","primary_cta":"进入教学管理","secondary_cta":"了解课程体系"}'::jsonb,
    '首页首屏文案'
  ),
  (
    'home.about',
    '{"title":"关于风驰思维","content":"风驰思维魔方专注少儿魔方与思维训练，课程按认知发展阶段分层设计，从入门的色块认知、基础还原，到进阶的 CFOP 提速，再到盲拧与竞速竞技，形成完整的成长路径。我们坚持小班教学、一人一档案、阶段有测评，让每一次进步都可被看见。"}'::jsonb,
    '首页机构介绍'
  ),
  (
    'home.highlights',
    '{"items":[
      {"title":"分层课程体系","desc":"启蒙 / 进阶 / 竞速 / 盲拧四阶递进，按年龄与基础匹配","color":"#3366ff"},
      {"title":"小班教练制","desc":"每班 6-8 人，教练跟进到人，进度可追踪","color":"#22c55e"},
      {"title":"阶段化测评","desc":"每个阶段有测评与成绩档案，成长看得见","color":"#f97316"},
      {"title":"教研资源共享","desc":"教案、公式图表、视频素材统一归档，团队共用","color":"#ef4444"}
    ]}'::jsonb,
    '首页特色亮点'
  ),
  (
    'stats.baseline',
    '{"students":0,"coaches":0,"lessons":0,"years":0}'::jsonb,
    '对外展示的累计数据（手填补充）'
  )
on conflict (key) do nothing;

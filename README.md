# 风驰思维魔方 · 教学管理系统

面向 **风驰思维魔方** 机构内部教师使用的教学管理系统。系统只服务于机构操作者（老师），不面向家长与学生。

- 线上地址：https://myscu-001.github.io/fengchi-mofang/
- 前端：Vue 3 + Vite + Tailwind CSS
- 后端：Supabase（认证 / 数据库 / 文件存储）
- 部署：GitHub Actions 自动构建并发布到 GitHub Pages

---

## 一、账号说明

**系统不开放自助注册。** 所有账号由超级管理员在「系统管理 → 账号管理」中开通。

- 教师账号由管理员创建并分配角色，初始密码首次登录后建议立即修改。
- 忘记密码可直接联系超级管理员在后台重置。

### 内置角色

| 角色 | 标识 | 能力范围 |
| --- | --- | --- |
| 超级管理员 | `admin` | 全部功能，含账号管理、角色权限、站点配置 |
| 机构老师 | `teacher` | 课程、学员、班级、成绩、资源的完整管理 |
| 助教 | `assistant` | 查看课程/学员/班级/成绩，可录入成绩、上传资源 |

权限点在数据库 `permissions` 表中维护，与前端菜单、按钮以及数据库行级安全策略（RLS）**三重一致**：界面上看不到的，接口层同样会被拒绝。

---

## 二、功能模块

| 模块 | 说明 |
| --- | --- |
| 首页 | 未登录展示机构品牌与教学理念；登录后展示实时教学数据看板 |
| 课程体系 | 课程列表、筛选、上下架；详情页维护课时教案（教学目标、公式口诀、课后练习） |
| 学员档案 | 一人一档，含家长联系方式、水平、状态；档案内可查看所在班级与成绩轨迹 |
| 开班管理 | 排课（星期/时段/教室/授课老师）、班级容量与名单管理 |
| 测评成绩 | 创建阶段测评，按班级一键带入学员名单，录入得分与三阶复原耗时 |
| 资源中心 | 分类归档教学资源，私有存储桶 + 限时签名链接下载，含下载排行 |
| 个人中心 | 资料与头像维护、修改密码、查看自己的权限清单 |
| 系统管理 | 账号管理、角色权限矩阵、站点配置（首页文案与联系方式） |

---

## 三、本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览构建产物
```

环境变量见 `.env.example`。本地开发时把 Supabase 配置写入 `.env`（该文件不会提交）。

> `VITE_SUPABASE_ANON_KEY` 是设计上可公开的客户端密钥，安全性由数据库 RLS 策略保障。
> **切勿**把 `service_role` 密钥放进任何前端文件。

---

## 四、数据库

脚本位于 `supabase/`，按顺序执行，均为幂等（可重复运行）：

| 文件 | 内容 |
| --- | --- |
| `01_schema.sql` | 扩展、枚举、15 张表、索引、函数、触发器、视图、存储桶、授权 |
| `02_seed_meta.sql` | 3 个角色、13 个权限点、角色权限映射、资源分类、站点配置 |
| `03_policies.sql` | 全表 RLS 策略 + 存储桶访问策略 |
| `04_demo_data.sql` | 4 门示例课程与 14 个课时（可选，可安全删除） |

### 表结构概览

```
roles ─┬─ role_permissions ─── permissions
       └─ profiles ←──(created_by / uploaded_by / recorded_by / teacher_id)
            │
courses ─┬─ course_lessons
         ├─ classes ── class_members ── students
         ├─ assessments ── grades ───── students
         └─ resources ─┬─ resource_categories
                       └─ resource_downloads

site_settings（键值型站点配置）
```

### 视图

- `v_course_overview`：课程 + 课时数 + 在班学员数 + 关联资源数
- `v_student_grade`：成绩 + 学员 + 测评 + 课程（用于成绩看板）

两个视图均设置 `security_invoker = on`。PostgreSQL 15+ 视图默认以定义者权限执行、会绕过 RLS，必须显式切换为调用者权限。

### 存储桶

| 桶 | 可见性 | 用途 |
| --- | --- | --- |
| `covers` | 公开读 | 课程封面，需课程编辑权限才能写入 |
| `avatars` | 公开读 | 用户头像，仅能写入 `{用户ID}/` 目录 |
| `resources` | 私有 | 教学资源，下载走 5 分钟有效的签名链接 |

---

## 五、管理员开通账号的后端函数

创建 / 删除 Auth 用户必须使用 `service_role` 密钥，该密钥**绝不能出现在浏览器端**。因此这类操作收敛到 Edge Function `admin-users`（源码见 `supabase/functions/admin-users/index.ts`）：

1. 用调用者的 JWT 换取身份；
2. 校验其角色是否具备 `user.manage` 权限；
3. 通过后以 `service_role` 身份调用 Supabase Auth 管理接口。

支持 `create` / `reset-password` / `delete` 三个操作。函数零外部依赖（仅用原生 `fetch`）。

重新部署：

```bash
supabase functions deploy admin-users --project-ref <你的项目ref>
```

---

## 六、部署

`.github/workflows/deploy.yml` 在 `main` 分支推送时自动执行：安装依赖 → 构建 → 上传产物 → 发布到 GitHub Pages。

构建配置从仓库内的 `.env.production` 读取（其中只有可公开的 anon key）。

**首次部署后需要在仓库设置里确认** `Settings → Pages → Source` 为 **GitHub Actions**。

站点使用 **hash 路由**（如 `/#/courses`）。GitHub Pages 是纯静态托管、没有重写规则，hash 模式可以保证任意页面刷新都不会 404。

---

## 七、目录结构

```
├── .github/workflows/deploy.yml    # 自动部署
├── public/                          # 静态资源
├── supabase/
│   ├── 01_schema.sql ~ 04_demo_data.sql
│   ├── config.toml
│   └── functions/admin-users/index.ts
└── src/
    ├── api/          # 各模块数据访问（课程/学员/班级/成绩/资源/用户/设置/统计）
    ├── components/   # 通用 UI（按钮/弹窗/分页/表格/空态…）与业务组件
    ├── layouts/      # AppLayout：页头 + 内容 + 页脚
    ├── lib/          # supabase 客户端、字典、格式化、权限映射
    ├── router/       # 路由与访问守卫
    ├── stores/       # Pinia：auth / toast / dialog
    ├── views/        # 页面（含 admin/ 子目录）
    └── style.css     # Tailwind 主题令牌与组件类
```

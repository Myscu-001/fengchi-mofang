import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * 使用 hash 路由：GitHub Pages 为纯静态托管，不支持下放到子路径的重写规则，
 * hash 模式可以保证任意页面刷新都不会 404。
 */
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页' } },
      {
        path: 'courses',
        name: 'courses',
        component: () => import('@/views/CoursesView.vue'),
        meta: { title: '课程体系', requiresAuth: true, permission: 'course.view' },
      },
      {
        path: 'courses/:id',
        name: 'course-detail',
        component: () => import('@/views/CourseDetailView.vue'),
        meta: { title: '课程详情', requiresAuth: true, permission: 'course.view' },
      },
      {
        path: 'students',
        name: 'students',
        component: () => import('@/views/StudentsView.vue'),
        meta: { title: '学员档案', requiresAuth: true, permission: 'student.view' },
      },
      {
        path: 'students/:id',
        name: 'student-detail',
        component: () => import('@/views/StudentDetailView.vue'),
        meta: { title: '学员档案', requiresAuth: true, permission: 'student.view' },
      },
      {
        path: 'resources',
        name: 'resources',
        component: () => import('@/views/ResourcesView.vue'),
        meta: { title: '资源中心', requiresAuth: true, permission: 'resource.view' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '个人中心', requiresAuth: true },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: { title: '账号管理', requiresAuth: true, permission: 'user.manage' },
      },
      {
        path: 'admin/roles',
        name: 'admin-roles',
        component: () => import('@/views/admin/RolesView.vue'),
        meta: { title: '角色权限', requiresAuth: true, permission: 'role.manage' },
      },
      {
        path: 'admin/coaches',
        name: 'admin-coaches',
        component: () => import('@/views/admin/CoachesView.vue'),
        meta: { title: '师资团队', requiresAuth: true, permission: 'coach.manage' },
      },
      {
        path: 'admin/settings',
        name: 'admin-settings',
        component: () => import('@/views/admin/SettingsView.vue'),
        meta: { title: '站点配置', requiresAuth: true, permission: 'settings.manage' },
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', layout: 'blank' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: '无访问权限', layout: 'blank' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在', layout: 'blank' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.init()
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.permission && auth.isLoggedIn && !auth.can(to.meta.permission)) {
    return { name: 'forbidden', query: { from: to.fullPath } }
  }

  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'home' }
  }

  return true
})

router.afterEach((to) => {
  const base = '风驰思维魔方'
  document.title = to.meta?.title ? `${to.meta.title} · ${base}` : base
})

export default router

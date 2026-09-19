<template>
  <div>
    <!-- 页头：左标题 / 右公司 logo（56×56，与网格图标同尺寸） -->
    <div class="fc-wb-head">
      <div class="min-w-0 flex-1">
        <h1>工作台</h1>
        <p>点击图标进入对应功能</p>
      </div>
      <div class="fc-wb-logo">
        <img :src="logoUrl" alt="风驰思维魔方" />
      </div>
    </div>

    <!-- 图标网格 -->
    <div class="fc-wb-body">
      <div class="fc-wb-grid">
        <button
          v-for="app in apps"
          :key="app.key"
          type="button"
          class="fc-wb-app"
          @click="open(app)"
        >
          <span class="fc-wb-tile" :style="{ '--tint': app.tint, '--ic': app.ic }">
            <component :is="app.icon" />
          </span>
          <span class="fc-wb-label">{{ app.label }}</span>
        </button>
      </div>
    </div>

    <!-- 系统管理：底部抽屉 -->
    <Transition name="fc-sheet-fade">
      <div v-if="sysOpen" class="fc-sheet-mask" @click="sysOpen = false" />
    </Transition>
    <Transition name="fc-sheet-slide">
      <div v-if="sysOpen" class="fc-sheet" role="dialog" aria-label="系统管理">
        <div class="fc-sheet-grip" />
        <h3>系统管理</h3>
        <p class="fc-sheet-sub">仅管理员可见，普通老师登录时本图标会自动隐藏</p>

        <button
          v-for="item in sysItems"
          :key="item.label"
          type="button"
          class="fc-sheet-row"
          @click="openSys(item)"
        >
          <span class="fc-sheet-mini" :style="{ '--tint': item.tint, '--ic': item.ic }">
            <component :is="item.icon" />
          </span>
          <span class="tx min-w-0 flex-1">
            <p>{{ item.label }}</p>
            <i>{{ item.desc }}</i>
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Award,
  BarChart3,
  Folder,
  FolderOpen,
  Layers,
  ScrollText,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  UserCog,
  Users,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const logoUrl = `${import.meta.env.BASE_URL}brand/logo-mark.png`

/* 首页工作台 = 原侧边栏/顶栏导航的图标化。
   配色与 mobile-home-v4.html 模拟稿完全一致：淡色底 + 彩色线性图标。 */
const appDefs = [
  {
    key: 'courses',
    label: '课程体系',
    icon: Layers,
    tint: '#E9EFFD',
    ic: '#3D6BF5',
    to: { name: 'courses' },
    perm: 'course.view',
  },
  {
    key: 'students',
    label: '学员档案',
    icon: Users,
    tint: '#FDEDEC',
    ic: '#E8564F',
    to: { name: 'students' },
    perm: 'student.view',
  },
  {
    key: 'analytics',
    label: '统计分析',
    icon: BarChart3,
    tint: '#EEEBFD',
    ic: '#7C6BF5',
    to: { name: 'analytics' },
    perm: 'score.view',
  },
  {
    key: 'honor',
    label: 'PB 荣誉墙',
    icon: Trophy,
    tint: '#FDF3E1',
    ic: '#D9A03C',
    to: { name: 'honor' },
    perm: 'score.view',
  },
  {
    key: 'resources',
    label: '资源中心',
    icon: FolderOpen,
    tint: '#EAF3E0',
    ic: '#7BA32C',
    to: { name: 'resources' },
    perm: 'resource.view',
  },
  { key: 'sys', label: '系统管理', icon: Folder, tint: '#ECEEF2', ic: '#5A6473', sys: true },
  {
    key: 'profile',
    label: '个人中心',
    icon: User,
    tint: '#E4F4F1',
    ic: '#2E9E90',
    to: { name: 'profile' },
  },
]

const sysDefs = [
  {
    label: '账号管理',
    desc: '开通账号 · 重置密码',
    to: { name: 'admin-users' },
    icon: UserCog,
    tint: '#E4F4F1',
    ic: '#2E9E90',
    perm: 'user.manage',
  },
  {
    label: '角色权限',
    desc: '管理员 / 老师 / 助教',
    to: { name: 'admin-roles' },
    icon: ShieldCheck,
    tint: '#E7F0FB',
    ic: '#4A90D9',
    perm: 'role.manage',
  },
  {
    label: '师资团队',
    desc: '老师资料与排课',
    to: { name: 'admin-coaches' },
    icon: Award,
    tint: '#FBE9F0',
    ic: '#D96A96',
    perm: 'coach.manage',
  },
  {
    label: '站点配置',
    desc: '品牌信息 · 段位体系',
    to: { name: 'admin-settings' },
    icon: Settings,
    tint: '#F0EFEA',
    ic: '#8A8A80',
    perm: 'settings.manage',
  },
  {
    label: '操作日志',
    desc: '谁改了什么',
    to: { name: 'admin-audit' },
    icon: ScrollText,
    tint: '#FBE9E4',
    ic: '#D9694F',
    perm: 'user.manage',
  },
]

const sysItems = computed(() => sysDefs.filter((i) => auth.can(i.perm)))

/** 系统管理文件夹：有任一管理权限才出现 */
const hasSys = computed(() => sysItems.value.length > 0)

const apps = computed(() =>
  appDefs.filter((app) => {
    if (app.sys) return hasSys.value
    return !app.perm || auth.can(app.perm)
  }),
)

const sysOpen = ref(false)

function open(app) {
  if (app.sys) {
    sysOpen.value = true
    return
  }
  if (app.to) router.push(app.to)
}

function openSys(item) {
  sysOpen.value = false
  router.push(item.to)
}

/* 抽屉打开时锁住背后页面的滚动（否则手指会带动底下的工作台一起滚） */
watch(sysOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="flex min-h-screen bg-ink-50">
    <!-- 左侧品牌区 -->
    <div class="fc-cube-bg relative hidden w-[46%] flex-col justify-between border-r border-ink-200 bg-white p-10 lg:flex">
      <LogoMark :size="40" />

      <div>
        <h1 class="text-[30px] leading-tight font-bold tracking-tight text-ink-900">
          让每一次转动<br />都有据可循
        </h1>
        <p class="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-600">
          课程、学员、班级、成绩与教学资源，统一在风驰思维魔方的教学管理系统里沉淀下来。
        </p>

        <ul class="mt-8 space-y-3">
          <li v-for="item in features" :key="item.title" class="flex items-start gap-2.5">
            <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <component :is="item.icon" class="size-3.5" />
            </span>
            <div>
              <p class="text-[13.5px] font-medium text-ink-800">{{ item.title }}</p>
              <p class="text-[12.5px] text-ink-500">{{ item.desc }}</p>
            </div>
          </li>
        </ul>
      </div>

      <div class="flex gap-2">
        <span
          v-for="(c, i) in cubeColors"
          :key="i"
          class="size-8 rounded-lg shadow-soft"
          :style="{ backgroundColor: c }"
        />
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="flex flex-1 items-center justify-center p-6">
      <div class="w-full max-w-[400px]">
        <div class="mb-8 lg:hidden">
          <LogoMark :size="38" />
        </div>

        <h2 class="text-[22px] font-bold tracking-tight text-ink-900">教师登录</h2>
        <p class="mt-1.5 text-[13.5px] text-ink-500">
          {{ brandName }} 内部教学管理系统
        </p>

        <div
          v-if="!configured"
          class="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-800"
        >
          <TriangleAlert class="mr-1.5 inline size-3.5" />
          系统尚未连接数据库，请联系管理员完成 Supabase 配置后再登录。
        </div>

        <form class="mt-7 space-y-4" @submit.prevent="handleSubmit">
          <UiField label="登录邮箱" required>
            <div class="relative">
              <Mail class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
              <input
                v-model="form.email"
                type="email"
                class="fc-input pl-9.5"
                placeholder="name@example.com"
                autocomplete="username"
                required
                :disabled="submitting"
              />
            </div>
          </UiField>

          <UiField label="密码" required>
            <div class="relative">
              <Lock class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="fc-input pr-10 pl-9.5"
                placeholder="请输入密码"
                autocomplete="current-password"
                required
                :disabled="submitting"
              />
              <button
                type="button"
                class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-ink-400 transition hover:text-ink-600"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
          </UiField>

          <Transition name="fc-drop">
            <p
              v-if="errorMsg"
              class="flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-relaxed text-red-700"
            >
              <CircleAlert class="mt-0.5 size-3.5 shrink-0" />
              {{ errorMsg }}
            </p>
          </Transition>

          <UiButton type="submit" variant="primary" size="lg" block :loading="submitting">
            {{ submitting ? '正在登录…' : '登录' }}
          </UiButton>
        </form>

        <div class="mt-7 rounded-xl border border-ink-200 bg-white px-4 py-3.5">
          <p class="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-600">
            <ShieldCheck class="mt-0.5 size-3.5 shrink-0 text-brand-500" />
            <span>
              教师账号由机构超级管理员统一开通，系统不开放自助注册。如需开通账号或忘记密码，请联系机构管理员重置。
            </span>
          </p>
        </div>

        <div class="mt-6 text-center">
          <RouterLink :to="{ name: 'home' }" class="inline-flex items-center gap-1 text-[13px] text-ink-500 transition hover:text-brand-600">
            <ArrowLeft class="size-3.5" />
            返回首页
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Boxes,
  CircleAlert,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-vue-next'
import LogoMark from '@/components/LogoMark.vue'
import UiField from '@/components/UiField.vue'
import UiButton from '@/components/UiButton.vue'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const configured = isSupabaseConfigured
const submitting = ref(false)
const showPassword = ref(false)
const errorMsg = ref('')
const brandName = ref('风驰思维魔方')

const form = reactive({ email: '', password: '' })

const features = [
  { icon: Boxes, title: '课程与教案', desc: '分层课程体系，课时教案在线维护' },
  { icon: Users, title: '学员与班级', desc: '一人一档案，开班排课一目了然' },
  { icon: TrendingUp, title: '测评与成绩', desc: '阶段测评留痕，进步轨迹可回溯' },
]

const cubeColors = ['#ef4444', '#facc15', '#3b82f6', '#f97316', '#22c55e']

onMounted(async () => {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site.brand')
      .maybeSingle()
    if (data?.value?.name) brandName.value = data.value.name
  } catch {
    // 使用默认品牌名
  }
})

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.email.trim() || !form.password) {
    errorMsg.value = '请填写邮箱与密码'
    return
  }

  submitting.value = true
  try {
    const profile = await auth.signIn(form.email, form.password)
    toast.success(`欢迎回来，${profile.full_name || '老师'}`)

    if (profile.must_change_password) {
      toast.warning('当前为初始密码，请先修改密码', 5000)
      router.replace({ name: 'profile' })
      return
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    router.replace(redirect || { name: 'home' })
  } catch (err) {
    errorMsg.value = err?.message || '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

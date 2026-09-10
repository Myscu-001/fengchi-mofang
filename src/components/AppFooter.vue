<template>
  <footer class="mt-16 border-t border-ink-200 bg-white">
    <div class="fc-container py-10">
      <div class="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <LogoMark />
          <p class="mt-3.5 max-w-sm text-[13px] leading-relaxed text-ink-500">
            {{ brand.slogan || '以魔方为载体，训练观察力、记忆力、空间想象力与专注力。' }}
          </p>
        </div>

        <div>
          <h4 class="text-[13px] font-semibold text-ink-800">教学管理</h4>
          <ul class="mt-3 space-y-2 text-[13px] text-ink-500">
            <li v-for="link in links" :key="link.label">
              <RouterLink :to="link.to" class="transition hover:text-brand-600">
                {{ link.label }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-[13px] font-semibold text-ink-800">联系我们</h4>
          <ul class="mt-3 space-y-2 text-[13px] text-ink-500">
            <li v-if="contact.phone" class="flex items-center gap-2">
              <Phone class="size-3.5 text-ink-400" />{{ contact.phone }}
            </li>
            <li v-if="contact.wechat" class="flex items-center gap-2">
              <MessageCircle class="size-3.5 text-ink-400" />微信 {{ contact.wechat }}
            </li>
            <li v-if="contact.email" class="flex items-center gap-2">
              <Mail class="size-3.5 text-ink-400" />{{ contact.email }}
            </li>
            <li v-if="contact.address" class="flex items-start gap-2">
              <MapPin class="mt-0.5 size-3.5 shrink-0 text-ink-400" />{{ contact.address }}
            </li>
            <li v-if="contact.hours" class="flex items-center gap-2">
              <Clock class="size-3.5 text-ink-400" />{{ contact.hours }}
            </li>
            <li v-if="!hasContact" class="text-ink-400">暂未填写联系方式</li>
          </ul>
        </div>
      </div>

      <div
        class="mt-8 flex flex-col items-center justify-between gap-2 border-t border-ink-200 pt-5 text-xs text-ink-400 sm:flex-row"
      >
        <p>© {{ year }} {{ brand.full_name || brand.name }}. 内部教学管理系统。</p>
        <p>仅供机构教师使用，请勿外传账号信息。</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-vue-next'
import LogoMark from '@/components/LogoMark.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const props = defineProps({
  brand: { type: Object, default: () => ({ name: '风驰思维魔方', slogan: '' }) },
  contact: { type: Object, default: () => ({}) },
})

const year = new Date().getFullYear()

const hasContact = computed(() =>
  ['phone', 'wechat', 'email', 'address', 'hours'].some((k) => props.contact?.[k]),
)

const allLinks = [
  { label: '课程体系', to: { name: 'courses' }, perm: 'course.view' },
  { label: '学员档案', to: { name: 'students' }, perm: 'student.view' },
  { label: '资源中心', to: { name: 'resources' }, perm: 'resource.view' },
  { label: '个人中心', to: { name: 'profile' }, perm: '' },
]

const links = computed(() => allLinks.filter((l) => !l.perm || auth.can(l.perm)))
</script>

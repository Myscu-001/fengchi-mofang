<template>
  <div>
    <PageHeader
      title="角色权限"
      description="调整各角色可以使用的功能。权限点与数据库行级安全策略一一对应，修改后立即生效"
    >
      <UiButton v-if="dirty" variant="outline" :disabled="saving" @click="reload">
        放弃修改
      </UiButton>
      <UiButton variant="primary" :loading="saving" :disabled="!dirty" @click="save">
        保存权限
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div v-if="loading" class="fc-card"><UiLoading text="正在加载角色权限…" /></div>

      <div v-else class="grid gap-5 lg:grid-cols-[260px_1fr]">
        <!-- 角色列表 -->
        <aside class="space-y-2.5">
          <button
            v-for="role in roles"
            :key="role.code"
            type="button"
            class="w-full rounded-xl border p-3.5 text-left transition"
            :class="activeRole === role.code ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:bg-ink-50'"
            @click="activeRole = role.code"
          >
            <div class="flex items-center justify-between">
              <span class="text-[14px] font-semibold text-ink-900">{{ role.name }}</span>
              <UiBadge v-if="role.is_system" label="内置" custom-class="bg-ink-100 text-ink-500 border-ink-200" />
            </div>
            <p class="mt-1 text-[12px] leading-relaxed text-ink-500">{{ role.description }}</p>
            <p class="mt-2 text-[11.5px] text-ink-400">
              已启用 <span class="font-semibold text-brand-600">{{ selectedCount(role.code) }}</span> / {{ permissions.length }} 项权限
            </p>
          </button>
        </aside>

        <!-- 权限矩阵 -->
        <section class="fc-card p-5">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4">
            <div>
              <h2 class="text-[16px] font-semibold text-ink-900">{{ activeRoleMeta?.name }} 的权限</h2>
              <p class="mt-1 text-[12.5px] text-ink-500">
                勾选后该角色的所有员工将立即获得对应功能；未勾选的功能在数据库层同样会被拒绝。
              </p>
            </div>
            <div class="flex gap-2">
              <UiButton size="sm" variant="outline" @click="selectAll(true)">全选</UiButton>
              <UiButton size="sm" variant="outline" @click="selectAll(false)">清空</UiButton>
            </div>
          </div>

          <div class="mt-5 space-y-6">
            <div v-for="group in groupedPermissions" :key="group.module">
              <div class="flex items-center gap-2">
                <component :is="moduleIcons[group.module] || Layers" class="size-4 text-brand-500" />
                <h3 class="text-[13.5px] font-semibold text-ink-800">{{ moduleLabels[group.module] || group.module }}</h3>
                <span class="text-[11.5px] text-ink-400">{{ group.items.length }} 项</span>
              </div>

              <div class="mt-3 grid gap-2.5 sm:grid-cols-2">
                <label
                  v-for="perm in group.items"
                  :key="perm.code"
                  class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition"
                  :class="
                    draft[perm.code]
                      ? 'border-brand-300 bg-brand-50/60'
                      : 'border-ink-200 hover:bg-ink-50'
                  "
                >
                  <input
                    v-model="draft[perm.code]"
                    type="checkbox"
                    class="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#1f47f5]"
                  />
                  <div class="min-w-0">
                    <p class="text-[13px] font-medium text-ink-800">{{ perm.name }}</p>
                    <p class="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{{ perm.description }}</p>
                    <p class="mt-1 font-mono text-[10.5px] text-ink-300">{{ perm.code }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-between border-t border-ink-200 pt-4">
            <p class="text-[12.5px] text-ink-500">
              <template v-if="dirty">有未保存的修改</template>
              <template v-else>当前配置已与数据库同步</template>
            </p>
            <UiButton variant="primary" :loading="saving" :disabled="!dirty" @click="save">保存权限</UiButton>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Boxes,
  FileStack,
  GraduationCap,
  Layers,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiLoading from '@/components/UiLoading.vue'
import { listRoles, listPermissions, listRolePermissions, setRolePermissions } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()

const roles = ref([])
const permissions = ref([])
const activeRole = ref('teacher')
const draft = reactive({})
const original = ref(new Set())
const loading = ref(true)
const saving = ref(false)

const moduleLabels = {
  system: '系统管理',
  course: '课程管理',
  student: '学员管理',
  class: '班级管理',
  grade: '成绩管理',
  resource: '资源管理',
}

const moduleIcons = {
  system: Settings,
  course: Boxes,
  student: Users,
  class: GraduationCap,
  grade: Trophy,
  resource: FileStack,
}

const activeRoleMeta = computed(() => roles.value.find((r) => r.code === activeRole.value))

const groupedPermissions = computed(() => {
  const map = new Map()
  for (const perm of permissions.value) {
    if (!map.has(perm.module)) map.set(perm.module, [])
    map.get(perm.module).push(perm)
  }
  return [...map.entries()]
    .map(([module, items]) => ({ module, items }))
    .sort((a, b) => (a.items[0]?.sort_order || 0) - (b.items[0]?.sort_order || 0))
})

const dirty = computed(() => {
  const current = new Set(Object.keys(draft).filter((k) => draft[k]))
  if (current.size !== original.value.size) return true
  for (const code of current) if (!original.value.has(code)) return true
  return false
})

function selectedCount(roleCode) {
  if (roleCode === activeRole.value) return Object.values(draft).filter(Boolean).length
  return permissionMap.value[roleCode]?.size || 0
}

const permissionMap = ref({})

function syncDraft() {
  for (const perm of permissions.value) {
    draft[perm.code] = original.value.has(perm.code)
  }
}

async function load() {
  loading.value = true
  try {
    const [roleList, permList, mapping] = await Promise.all([
      listRoles(),
      listPermissions(),
      listRolePermissions(),
    ])
    roles.value = roleList
    permissions.value = permList

    const map = {}
    for (const row of mapping) {
      if (!map[row.role_code]) map[row.role_code] = new Set()
      map[row.role_code].add(row.permission_code)
    }
    permissionMap.value = map
    applyRole(activeRole.value)
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

function applyRole(roleCode) {
  activeRole.value = roleCode
  original.value = new Set(permissionMap.value[roleCode] || [])
  syncDraft()
}

async function reload() {
  await load()
  toast.info('已放弃未保存的修改')
}

function selectAll(value) {
  for (const perm of permissions.value) draft[perm.code] = value
}

async function save() {
  saving.value = true
  try {
    const codes = Object.keys(draft).filter((k) => draft[k])
    await setRolePermissions(activeRole.value, codes)

    permissionMap.value = {
      ...permissionMap.value,
      [activeRole.value]: new Set(codes),
    }
    original.value = new Set(codes)
    syncDraft()

    toast.success(`${activeRoleMeta.value?.name} 的权限已更新`)

    // 若调整的是本人角色，刷新自身权限缓存
    if (auth.profile?.role_code === activeRole.value) await auth.refresh()
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

watch(activeRole, (code) => {
  if (loading.value) return
  original.value = new Set(permissionMap.value[code] || [])
  syncDraft()
})

onMounted(load)
</script>

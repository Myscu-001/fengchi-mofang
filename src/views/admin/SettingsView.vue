<template>
  <div>
    <PageHeader title="站点配置" description="维护首页展示文案与机构联系方式，保存后站点立即生效">
      <UiButton variant="primary" :loading="savingAll" @click="saveAll">
        <template #icon><Save class="size-4" /></template>
        保存全部
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div v-if="loading" class="fc-card"><UiLoading text="正在加载配置…" /></div>

      <div v-else class="space-y-5">
        <!-- 品牌 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <Sparkles class="size-4 text-brand-500" />品牌信息
            </h2>
            <UiButton size="sm" variant="outline" :loading="savingKey === 'site.brand'" @click="saveOne('site.brand')">
              保存本节
            </UiButton>
          </header>

          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <UiField label="机构简称" hint="显示在导航栏与页脚">
              <input v-model="brand.name" class="fc-input" />
            </UiField>
            <UiField label="机构全称">
              <input v-model="brand.full_name" class="fc-input" />
            </UiField>
            <div class="sm:col-span-2">
              <UiField label="品牌标语">
                <input v-model="brand.slogan" class="fc-input" />
              </UiField>
            </div>
            <UiField label="LOGO 图片地址" class="sm:col-span-2" hint="留空则使用内置魔方图标">
              <input v-model="brand.logo_url" class="fc-input" placeholder="https://…" />
            </UiField>
          </div>
        </section>

        <!-- 联系方式 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <Phone class="size-4 text-brand-500" />联系方式
            </h2>
            <UiButton size="sm" variant="outline" :loading="savingKey === 'site.contact'" @click="saveOne('site.contact')">
              保存本节
            </UiButton>
          </header>

          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <UiField label="联系电话">
              <input v-model="contact.phone" class="fc-input" placeholder="例：138-0000-0000" />
            </UiField>
            <UiField label="微信号">
              <input v-model="contact.wechat" class="fc-input" />
            </UiField>
            <UiField label="邮箱">
              <input v-model="contact.email" class="fc-input" />
            </UiField>
            <UiField label="营业时间">
              <input v-model="contact.hours" class="fc-input" placeholder="例：周一至周日 09:00 - 21:00" />
            </UiField>
            <div class="sm:col-span-2">
              <UiField label="机构地址">
                <input v-model="contact.address" class="fc-input" />
              </UiField>
            </div>
          </div>
        </section>

        <!-- 首页首屏 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <House class="size-4 text-brand-500" />首页首屏
            </h2>
            <UiButton size="sm" variant="outline" :loading="savingKey === 'home.hero'" @click="saveOne('home.hero')">
              保存本节
            </UiButton>
          </header>

          <div class="mt-4 space-y-4">
            <UiField label="主标题">
              <input v-model="hero.title" class="fc-input" />
            </UiField>
            <UiField label="副标题 / 简介">
              <textarea v-model="hero.subtitle" class="fc-input" rows="3" />
            </UiField>
            <div class="grid gap-4 sm:grid-cols-2">
              <UiField label="主按钮文案">
                <input v-model="hero.primary_cta" class="fc-input" />
              </UiField>
              <UiField label="次按钮文案">
                <input v-model="hero.secondary_cta" class="fc-input" />
              </UiField>
            </div>
          </div>
        </section>

        <!-- 机构介绍 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <BookOpen class="size-4 text-brand-500" />机构介绍
            </h2>
            <UiButton size="sm" variant="outline" :loading="savingKey === 'home.about'" @click="saveOne('home.about')">
              保存本节
            </UiButton>
          </header>

          <div class="mt-4 space-y-4">
            <UiField label="标题">
              <input v-model="about.title" class="fc-input" />
            </UiField>
            <UiField label="正文" hint="支持多段，每行一段">
              <textarea v-model="about.content" class="fc-input" rows="6" />
            </UiField>
          </div>
        </section>

        <!-- 特色亮点 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <Star class="size-4 text-brand-500" />特色亮点
            </h2>
            <div class="flex gap-2">
              <UiButton size="sm" variant="outline" @click="addHighlight">
                <template #icon><Plus class="size-3.5" /></template>
                添加
              </UiButton>
              <UiButton size="sm" variant="outline" :loading="savingKey === 'home.highlights'" @click="saveOne('home.highlights')">
                保存本节
              </UiButton>
            </div>
          </header>

          <div class="mt-4 space-y-3">
            <div
              v-for="(item, i) in highlights"
              :key="i"
              class="flex flex-wrap items-start gap-3 rounded-xl border border-ink-200 p-3.5"
            >
              <input
                v-model="item.color"
                type="color"
                class="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5"
              />
              <input v-model="item.title" class="fc-input w-full sm:w-48" placeholder="亮点标题" />
              <input v-model="item.desc" class="fc-input min-w-[200px] flex-1" placeholder="一句话说明" />
              <UiButton size="sm" variant="ghost" @click="highlights.splice(i, 1)">
                <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
              </UiButton>
            </div>
            <p v-if="!highlights.length" class="py-4 text-center text-[13px] text-ink-400">暂无亮点，点击上方「添加」开始</p>
          </div>
        </section>

        <!-- 对外累计数据 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <TrendingUp class="size-4 text-brand-500" />对外累计数据
            </h2>
            <UiButton size="sm" variant="outline" :loading="savingKey === 'stats.baseline'" @click="saveOne('stats.baseline')">
              保存本节
            </UiButton>
          </header>
          <p class="mt-3 text-[12.5px] text-ink-500">填 0 表示该指标不在首页展示。</p>
          <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <UiField label="在读学员">
              <input v-model.number="baseline.students" type="number" min="0" class="fc-input" />
            </UiField>
            <UiField label="专业教练">
              <input v-model.number="baseline.coaches" type="number" min="0" class="fc-input" />
            </UiField>
            <UiField label="累计课时">
              <input v-model.number="baseline.lessons" type="number" min="0" class="fc-input" />
            </UiField>
            <UiField label="办学年数">
              <input v-model.number="baseline.years" type="number" min="0" class="fc-input" />
            </UiField>
          </div>
        </section>

        <!-- 魔方段位体系 -->
        <section class="fc-card p-5">
          <header class="flex items-center justify-between border-b border-ink-200 pb-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <Award class="size-4 text-brand-500" />魔方段位体系
            </h2>
            <div class="flex gap-2">
              <UiButton size="sm" variant="ghost" @click="resetRanks">恢复默认</UiButton>
              <UiButton size="sm" variant="outline" :loading="savingKey === 'cube.ranks'" @click="saveRanksSection">
                保存本节
              </UiButton>
            </div>
          </header>
          <p class="mt-3 text-[12.5px] text-ink-500">
            段位按各项目「最佳平均成绩 (Ao5)」自动评定：填写达到该段位所需的秒数上限，数值越小代表水平越高。保存后立即在统计分析与学员档案生效。
          </p>

          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <div
              v-for="proj in CUBE_PROJECTS"
              :key="proj.value"
              class="rounded-xl border border-ink-200 p-4"
            >
              <div class="mb-3 flex items-center justify-between">
                <h3 class="flex items-center gap-2 text-[14px] font-semibold text-ink-800">
                  <span class="inline-block h-3 w-3 rounded-full" :style="{ backgroundColor: proj.color }"></span>
                  {{ proj.label }}
                  <span class="text-[12px] font-normal text-ink-400">{{ proj.short }}</span>
                </h3>
                <UiButton size="sm" variant="ghost" @click="addTier(proj.value)">
                  <template #icon><Plus class="size-3.5" /></template>添加段位
                </UiButton>
              </div>

              <div class="space-y-2.5">
                <div
                  v-for="(tier, i) in ranks[proj.value]"
                  :key="tier.key || i"
                  class="flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 p-2.5"
                >
                  <input v-model="tier.label" class="fc-input w-24" placeholder="段位名" />
                  <div class="flex items-center gap-1">
                    <input
                      v-model.number="tier.max"
                      type="number"
                      min="0"
                      step="0.5"
                      class="fc-input w-24"
                      placeholder="秒数"
                    />
                    <span class="text-[12px] text-ink-400">秒</span>
                  </div>
                  <input
                    v-model="tier.color"
                    type="color"
                    class="h-9 w-10 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5"
                    title="段位颜色"
                  />
                  <UiButton size="sm" variant="ghost" class="ml-auto" @click="ranks[proj.value].splice(i, 1)">
                    <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
                  </UiButton>
                </div>
                <p v-if="!ranks[proj.value]?.length" class="py-2 text-center text-[12.5px] text-ink-400">
                  暂无段位，点击「添加段位」开始
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  Award,
  BookOpen,
  House,
  Phone,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiField from '@/components/UiField.vue'
import UiLoading from '@/components/UiLoading.vue'
import { listSettings, saveSetting } from '@/api/settings'
import { CUBE_PROJECTS } from '@/lib/dict'
import { ensureRanksLoaded, saveRanks, DEFAULT_RANKS } from '@/lib/ranks'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const loading = ref(true)
const savingAll = ref(false)
const savingKey = ref('')

const brand = reactive({ name: '', full_name: '', slogan: '', logo_url: '' })
const contact = reactive({ phone: '', wechat: '', email: '', address: '', hours: '' })
const hero = reactive({ title: '', subtitle: '', primary_cta: '', secondary_cta: '' })
const about = reactive({ title: '', content: '' })
const highlights = ref([])
const baseline = reactive({ students: 0, coaches: 0, lessons: 0, years: 0 })
const ranks = reactive({})

function buildLocalRanks(src) {
  for (const p of CUBE_PROJECTS) {
    ranks[p.value] = (src[p.value] || []).map((t) => ({ ...t }))
  }
}

async function load() {
  loading.value = true
  try {
    const { map } = await listSettings()
    Object.assign(brand, map['site.brand'] || {})
    Object.assign(contact, map['site.contact'] || {})
    Object.assign(hero, map['home.hero'] || {})
    Object.assign(about, map['home.about'] || {})
    highlights.value = map['home.highlights']?.items || []
    Object.assign(baseline, map['stats.baseline'] || {})
    buildLocalRanks(await ensureRanksLoaded())
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

function addTier(project) {
  if (!ranks[project]) ranks[project] = []
  ranks[project].push({ key: `r${ranks[project].length + 1}`, label: '', max: 0, color: '#93BC37' })
}

function resetRanks() {
  buildLocalRanks(DEFAULT_RANKS)
  toast.success('已恢复系统默认段位，点击「保存本节」生效')
}

async function saveRanksSection() {
  savingKey.value = 'cube.ranks'
  try {
    await saveRanks(JSON.parse(JSON.stringify(ranks)))
    toast.success('段位体系已保存')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingKey.value = ''
  }
}

function addHighlight() {
  highlights.value.push({ title: '', desc: '', color: '#3366ff' })
}

async function saveOne(key) {
  savingKey.value = key
  try {
    await saveSetting(key, buildValue(key))
    toast.success('已保存')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingKey.value = ''
  }
}

async function saveAll() {
  savingAll.value = true
  const keys = ['site.brand', 'site.contact', 'home.hero', 'home.about', 'home.highlights', 'stats.baseline', 'cube.ranks']
  try {
    await Promise.all(keys.map((key) => saveSetting(key, buildValue(key))))
    await ensureRanksLoaded()
    toast.success('站点配置已全部保存')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingAll.value = false
  }
}

function buildValue(key) {
  switch (key) {
    case 'site.brand':
      return { ...brand }
    case 'site.contact':
      return { ...contact }
    case 'home.hero':
      return { ...hero }
    case 'home.about':
      return { ...about }
    case 'home.highlights':
      return { items: highlights.value.filter((i) => i.title.trim()) }
    case 'stats.baseline':
      return {
        students: Number(baseline.students) || 0,
        coaches: Number(baseline.coaches) || 0,
        lessons: Number(baseline.lessons) || 0,
        years: Number(baseline.years) || 0,
      }
    case 'cube.ranks':
      return JSON.parse(JSON.stringify(ranks))
    default:
      return {}
  }
}

onMounted(load)
</script>

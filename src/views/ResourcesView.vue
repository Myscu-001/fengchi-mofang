<template>
  <div>
    <PageHeader title="资源中心" description="教学课件、教研资料、赛事文档统一归档，随时下载">
      <template v-if="canManage">
        <UiButton variant="outline" @click="categoryOpen = true">
          <template #icon><FolderCog class="size-3.5" /></template>
          管理分类
        </UiButton>
        <UiButton variant="primary" @click="openUpload">
          <template #icon><Upload class="size-4" /></template>
          上传资源
        </UiButton>
      </template>
    </PageHeader>

    <div class="fc-container py-7">
      <div class="grid gap-5 lg:grid-cols-[228px_1fr]">
        <!-- 分类 -->
        <aside>
          <div class="fc-card overflow-hidden p-1.5">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] transition"
              :class="!filters.categoryId ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-600 hover:bg-ink-50'"
              @click="setCategory('')"
            >
              <span class="flex items-center gap-2">
                <LayoutGrid class="size-4" />
                全部资源
              </span>
              <span class="text-[11.5px] text-ink-400 tabular-nums">{{ totalCount }}</span>
            </button>

            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] transition"
              :class="filters.categoryId === cat.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-600 hover:bg-ink-50'"
              @click="setCategory(cat.id)"
            >
              <span class="flex min-w-0 items-center gap-2">
                <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: cat.color || '#3366ff' }" />
                <span class="truncate">{{ cat.name }}</span>
              </span>
              <span class="shrink-0 text-[11.5px] text-ink-400 tabular-nums">{{ counts[cat.id] || 0 }}</span>
            </button>

            <RouterLink
              v-if="auth.can('resource.manage')"
              :to="{ name: 'admin-settings' }"
              class="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-ink-400 transition hover:bg-ink-50 hover:text-ink-600"
            >
              <Settings class="size-3.5" />
              在站点配置中调整
            </RouterLink>
          </div>

          <div class="fc-card mt-3.5 p-4">
            <h3 class="text-[13px] font-semibold text-ink-800">下载排行</h3>
            <ul v-if="topList.length" class="mt-2.5 space-y-2.5">
              <li
                v-for="(r, i) in topList"
                :key="r.id"
                class="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 transition hover:bg-ink-50"
                @click="openResource(r)"
              >
                <span
                  class="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded text-[10px] font-semibold"
                  :class="i < 3 ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'"
                >
                  {{ i + 1 }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-1 text-[12.5px] text-ink-700">{{ r.title }}</p>
                  <p class="text-[11px] text-ink-400">{{ r.download_count }} 次下载</p>
                </div>
              </li>
            </ul>
            <p v-else class="mt-2.5 text-[12.5px] text-ink-400">暂无下载记录</p>
          </div>
        </aside>

        <!-- 列表 -->
        <section>
          <div class="fc-card flex flex-wrap items-center gap-2.5 p-3.5">
            <div class="relative min-w-[200px] flex-1">
              <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
              <input
                v-model="filters.keyword"
                class="fc-input pl-9.5"
                placeholder="搜索资源名称或文件名"
                @keyup.enter="applyFilters"
              />
            </div>
            <select v-model="filters.project" class="fc-input w-auto min-w-[118px]" @change="onProjectChange">
              <option value="">全部项目</option>
              <option v-for="p in CUBE_PROJECTS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
            <select v-model="filters.fileType" class="fc-input w-auto min-w-[120px]" @change="applyFilters">
              <option value="">全部类型</option>
              <option v-for="o in FILE_KIND_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <select v-model="filters.sort" class="fc-input w-auto min-w-[124px]" @change="applyFilters">
              <option value="newest">最新上传</option>
              <option value="popular">下载最多</option>
              <option value="oldest">最早上传</option>
              <option value="name">按名称</option>
            </select>
            <UiButton variant="outline" @click="resetFilters">
              <template #icon><RotateCcw class="size-3.5" /></template>
              重置
            </UiButton>
          </div>

          <div v-if="allTags.length" class="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span class="text-[12px] text-ink-400">标签：</span>
            <button
              v-for="t in allTags"
              :key="t.name"
              type="button"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition"
              :class="filters.tag === t.name
                ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'"
              @click="toggleTag(t.name)"
            >
              {{ t.name }}
              <span class="text-ink-400 tabular-nums">{{ t.count }}</span>
            </button>
          </div>

          <div v-if="loading" class="fc-card mt-4"><UiLoading text="正在加载资源…" /></div>

          <div v-else-if="resources.length" class="mt-4">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="res in resources"
                :key="res.id"
                class="fc-card group flex cursor-pointer flex-col p-4 transition hover:shadow-lift"
                @click="openResource(res)"
              >
                <div class="flex items-start gap-3">
                  <ResourceIcon :kind="res.file_type" />
                  <div class="min-w-0 flex-1">
                    <h3 class="line-clamp-1 text-[13.5px] font-medium text-ink-900" :title="res.title">
                      {{ res.title }}
                    </h3>
                    <p class="mt-0.5 line-clamp-1 text-[11.5px] text-ink-400" :title="res.file_name">
                      {{ res.file_name }}
                    </p>
                  </div>
                  <div v-if="canManage" class="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                      title="编辑"
                      @click.stop="openEdit(res)"
                    >
                      <Pencil class="size-3.5" />
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                      title="删除"
                      @click.stop="remove(res)"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </div>

                <p v-if="res.description" class="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">
                  {{ res.description }}
                </p>

                <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <UiBadge
                    v-if="isLinkResource(res)"
                    label="链接"
                    custom-class="bg-sky-50 text-sky-600 border-sky-200"
                  />
                  <UiBadge
                    v-for="vp in projectTags(res)"
                    :key="vp.value"
                    :label="vp.label"
                    custom-class="border-transparent text-white"
                    :style="{ backgroundColor: vp.color }"
                  />
                  <UiBadge
                    v-if="res.category"
                    :label="res.category.name"
                    :custom-class="'border-transparent'"
                    :style="{ backgroundColor: `${res.category.color}1a`, color: res.category.color }"
                  />
                  <UiBadge
                    v-if="res.version"
                    :label="res.version"
                    custom-class="bg-ink-100 text-ink-600 border-ink-200"
                  />
                  <span
                    v-for="t in freeTags(res)"
                    :key="t"
                    class="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-500"
                  >#{{ t }}</span>
                </div>

                <div class="mt-2.5 flex items-center gap-3 text-[11.5px] text-ink-400">
                  <span>{{ isLinkResource(res) ? '外部链接' : formatFileSize(res.file_size) }}</span>
                  <span>{{ formatDate(res.created_at) }}</span>
                  <span class="inline-flex items-center gap-0.5">
                    <Download class="size-3" />{{ res.download_count }}
                  </span>
                </div>

                <div class="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3">
                  <UiButton
                    variant="outline"
                    size="sm"
                    :title="isLinkResource(res) ? '打开链接' : '预览'"
                    @click.stop="openResource(res)"
                  >
                    <template #icon>
                      <ExternalLink v-if="isLinkResource(res)" class="size-3.5" />
                      <Eye v-else class="size-3.5" />
                    </template>
                    {{ isLinkResource(res) ? '打开' : '预览' }}
                  </UiButton>
                  <UiButton
                    v-if="isLinkResource(res)"
                    variant="secondary"
                    size="sm"
                    block
                    @click.stop="copyLink(res)"
                  >
                    <template #icon><Copy class="size-3.5" /></template>
                    复制链接
                  </UiButton>
                  <UiButton
                    v-else
                    variant="primary"
                    size="sm"
                    block
                    :loading="downloadingId === res.id"
                    @click.stop="download(res)"
                  >
                    <template #icon><Download class="size-3.5" /></template>
                    下载
                  </UiButton>
                </div>
              </div>
            </div>

            <div v-if="total > pageSize" class="mt-5">
              <UiPagination v-model:page="page" :page-size="pageSize" :total="total" />
            </div>
          </div>

          <div v-else class="fc-card mt-4">
            <UiEmpty
              :icon="FolderOpen"
              title="还没有资源"
              description="上传课件、教案、公式图表或视频素材，团队即可共享。"
            >
              <UiButton v-if="canManage" variant="primary" @click="openUpload">
                <template #icon><Upload class="size-4" /></template>
                上传资源
              </UiButton>
            </UiEmpty>
          </div>
        </section>
      </div>
    </div>

    <!-- 上传 / 编辑 -->
    <UiModal
      :open="formOpen"
      :title="editing ? '编辑资源信息' : '上传资源'"
      width="md"
      @close="formOpen = false"
    >
      <div class="space-y-4">
        <!-- 资源来源切换（仅新增时可选） -->
        <div v-if="!editing" class="flex rounded-lg bg-ink-100 p-0.5">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium transition"
            :class="form.mode === 'file' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
            @click="form.mode = 'file'"
          >
            <Upload class="size-3.5" />上传文件
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium transition"
            :class="form.mode === 'link' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
            @click="form.mode = 'link'"
          >
            <Link2 class="size-3.5" />外部链接
          </button>
        </div>

        <!-- 外部链接（不占存储，适合视频等大文件） -->
        <template v-if="form.mode === 'link'">
          <UiField label="外部链接地址" required hint="视频建议用 B站 / 腾讯云点播等外部地址，不占用本系统存储">
            <input v-model="form.linkUrl" class="fc-input" placeholder="https://…" />
          </UiField>
          <UiField label="链接类型">
            <select v-model="form.linkType" class="fc-input">
              <option v-for="o in FILE_KIND_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </UiField>
        </template>

        <!-- 拖拽区（仅上传文件时显示） -->
        <div v-if="!editing && form.mode === 'file'">
          <div
            class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-7 text-center transition"
            :class="
              dragOver
                ? 'border-brand-400 bg-brand-50'
                : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-ink-200 bg-ink-50 hover:border-brand-300 hover:bg-brand-50/40'
            "
            @click="$refs.fileInput.click()"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="handleDrop"
          >
            <template v-if="selectedFile">
              <FileCheck class="size-7 text-emerald-500" />
              <p class="mt-2.5 text-[13.5px] font-medium text-ink-800">{{ selectedFile.name }}</p>
              <p class="mt-0.5 text-[12px] text-ink-500">{{ formatFileSize(selectedFile.size) }}</p>
              <button
                type="button"
                class="mt-2 text-[12px] text-brand-600 hover:underline"
                @click.stop="selectedFile = null"
              >
                重新选择
              </button>
            </template>
            <template v-else>
              <UploadCloud class="size-7 text-ink-400" />
              <p class="mt-2.5 text-[13.5px] font-medium text-ink-700">点击选择文件，或拖拽到此处</p>
              <p class="mt-0.5 text-[12px] text-ink-400">单个文件不超过 {{ MAX_UPLOAD_LABEL }}</p>
            </template>
            <input ref="fileInput" type="file" class="hidden" @change="handleFile" />
          </div>

          <div v-if="progress > 0" class="mt-2.5">
            <div class="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div class="h-full rounded-full bg-brand-500 transition-all" :style="{ width: `${progress}%` }" />
            </div>
            <p class="mt-1 text-[11.5px] text-ink-400">{{ progress }}%</p>
          </div>
        </div>

        <UiField label="资源标题" required>
          <input v-model="form.title" class="fc-input" placeholder="留空则使用文件名" />
        </UiField>

        <UiField label="资源说明">
          <textarea v-model="form.description" class="fc-input" rows="2" placeholder="用途、适用阶段、注意事项…" />
        </UiField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="资源分类">
            <select v-model="form.category_id" class="fc-input">
              <option value="">未分类</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </UiField>
          <UiField label="关联课程">
            <select v-model="form.course_id" class="fc-input">
              <option value="">不关联</option>
              <option v-for="c in courseOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
          </UiField>
          <UiField label="版本号">
            <input v-model="form.version" class="fc-input" placeholder="例：v1.2" />
          </UiField>
          <UiField label="可见范围">
            <select v-model="form.visibility" class="fc-input">
              <option value="internal">仅机构内部</option>
              <option value="public">公开</option>
            </select>
          </UiField>
          <div class="sm:col-span-2">
            <UiField label="适用魔方项目" hint="可多选；绑定后学员档案中会展示相关教学资源">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="p in CUBE_PROJECTS"
                  :key="p.value"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition"
                  :class="form.projects.includes(p.value)
                    ? 'border-transparent font-medium text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'"
                  :style="form.projects.includes(p.value) ? { backgroundColor: p.color } : {}"
                  @click="toggleProject(p.value)"
                >
                  <span
                    class="size-2 rounded-sm"
                    :style="{ backgroundColor: form.projects.includes(p.value) ? 'rgba(255,255,255,.85)' : p.color }"
                  />
                  {{ p.label }}
                </button>
              </div>
            </UiField>
          </div>
          <div class="sm:col-span-2">
            <UiField label="标签" hint="多个标签用逗号分隔">
              <input v-model="tagsInput" class="fc-input" placeholder="层先法, 图示, 入门" />
            </UiField>
          </div>
        </div>

        <p v-if="formError" class="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ formError }}
        </p>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="formOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="saving" :disabled="!canSubmit" @click="submit">
          {{ editing ? '保存修改' : form.mode === 'link' ? '添加链接' : '上传' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- 分类管理 -->
    <UiModal :open="categoryOpen" title="资源分类管理" width="md" @close="categoryOpen = false">
      <div class="space-y-2.5">
        <div v-for="cat in categories" :key="cat.id" class="flex items-center gap-2 rounded-xl border border-ink-200 p-2.5">
          <input v-model="cat.name" class="fc-input flex-1 py-1.5" placeholder="分类名称" />
          <input v-model="cat.color" type="color" class="h-9 w-11 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5" />
          <input v-model.number="cat.sort_order" type="number" class="fc-input w-16 py-1.5 text-center" title="排序" />
          <UiButton size="sm" variant="secondary" :loading="catSaving === cat.id" @click="saveCategory(cat)">
            <template #icon><Check class="size-3.5" /></template>
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="removeCategory(cat)">
            <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
          </UiButton>
        </div>

        <div class="flex items-center gap-2 rounded-xl border border-dashed border-ink-300 p-2.5">
          <input v-model="newCategory" class="fc-input flex-1 py-1.5" placeholder="新增分类名称" @keyup.enter="addCategory" />
          <UiButton size="sm" variant="primary" :disabled="!newCategory.trim()" :loading="addingCategory" @click="addCategory">
            <template #icon><Plus class="size-3.5" /></template>
            新增
          </UiButton>
        </div>
      </div>
      <template #footer>
        <UiButton variant="primary" @click="categoryOpen = false">完成</UiButton>
      </template>
    </UiModal>

    <!-- 在线预览 -->
    <UiModal
      :open="previewOpen"
      :title="previewing?.title"
      :subtitle="previewing?.file_name"
      width="xl"
      @close="previewOpen = false"
    >
      <div v-if="previewLoading" class="py-12">
        <UiLoading text="正在准备预览…" />
      </div>
      <div v-else-if="previewing" class="min-h-[200px]">
        <img
          v-if="previewKind === 'image'"
          :src="previewSrc"
          class="mx-auto max-h-[70vh] rounded-lg object-contain"
          alt="预览"
        />
        <iframe
          v-else-if="previewKind === 'pdf'"
          :src="previewSrc"
          class="h-[70vh] w-full rounded-lg border border-ink-200 bg-white"
          title="PDF 预览"
        />
        <div v-else-if="previewKind === 'video'" class="flex justify-center">
          <video :src="previewSrc" controls class="max-h-[70vh] w-full rounded-lg bg-black" />
        </div>
        <div v-else-if="previewKind === 'audio'" class="py-10">
          <audio :src="previewSrc" controls class="mx-auto w-full" />
        </div>
        <pre
          v-else-if="previewKind === 'text'"
          class="max-h-[70vh] overflow-auto rounded-lg bg-ink-50 p-4 text-[12.5px] leading-relaxed text-ink-700"
        >{{ previewText }}</pre>
        <div v-else-if="previewKind === 'pdf-mobile'" class="py-12 text-center">
          <p class="text-[13.5px] text-ink-500">手机浏览器不支持内嵌预览 PDF，请点击下方按钮用系统阅读器打开。</p>
          <a
            :href="previewSrc"
            target="_blank"
            rel="noopener"
            class="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-4 py-2 text-[13px] font-medium text-white shadow-soft transition hover:bg-brand-700"
          >
            <ExternalLink class="size-3.5" />
            打开 PDF
          </a>
        </div>
        <div v-else class="py-12 text-center">
          <p class="text-[13.5px] text-ink-500">
            此文件类型（{{ previewLabel }}）暂不支持在线预览，请在下方下载，或点击「新窗口打开」由浏览器尝试查看。
          </p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="previewOpen = false">关闭</UiButton>
        <UiButton
          v-if="previewSrc && previewKind !== 'text'"
          variant="secondary"
          @click="openRaw"
        >
          <template #icon><ExternalLink class="size-3.5" /></template>
          新窗口打开
        </UiButton>
        <UiButton
          v-if="previewing"
          variant="primary"
          :loading="downloadingId === previewing.id"
          @click="download(previewing)"
        >
          <template #icon><Download class="size-3.5" /></template>
          下载
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FolderCog,
  FolderOpen,
  LayoutGrid,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import UiPagination from '@/components/UiPagination.vue'
import ResourceIcon from '@/components/ResourceIcon.vue'
import {
  listCategories,
  categoryCounts,
  createCategory,
  updateCategory,
  deleteCategory,
  listResources,
  listTagStats,
  uploadResource,
  createLinkResource,
  isLinkResource,
  updateResource,
  deleteResource,
  downloadResource,
  previewUrl,
  topResources,
} from '@/api/resources'
import { listCourseOptions } from '@/api/courses'
import {
  CUBE_PROJECTS,
  cubeProjectMeta,
  FILE_KIND_OPTIONS,
  isCubeProject,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from '@/lib/dict'
import { formatDate, formatFileSize } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()
const route = useRoute()

const canManage = computed(() => auth.can('resource.manage'))

const categories = ref([])
const counts = ref({})
const resources = ref([])
const topList = ref([])
const total = ref(0)
const totalCount = ref(0)
const page = ref(1)
const pageSize = 12
const loading = ref(true)
const downloadingId = ref(null)

const filters = reactive({ keyword: '', categoryId: '', fileType: '', project: '', tag: '', sort: 'newest' })
const tagStats = ref({})

/** 普通标签（排除「适用魔方项目」标签），按使用次数倒序 */
const allTags = computed(() =>
  Object.entries(tagStats.value)
    .filter(([name]) => !isCubeProject(name))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh')),
)

function projectTags(res) {
  return (res.tags || []).filter(isCubeProject).map((v) => cubeProjectMeta(v)).filter(Boolean)
}
function freeTags(res) {
  return (res.tags || []).filter((t) => !isCubeProject(t))
}

const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const selectedFile = ref(null)
const tagsInput = ref('')
const progress = ref(0)
const dragOver = ref(false)

const categoryOpen = ref(false)
const newCategory = ref('')
const addingCategory = ref(false)
const catSaving = ref(null)

const courseOptions = ref([])

// 在线预览
const previewOpen = ref(false)
const previewing = ref(null)
const previewLoading = ref(false)
const previewKind = ref('other')
const previewSrc = ref('')
const previewText = ref('')

const KIND_LABEL = {
  pdf: 'PDF',
  image: '图片',
  video: '音视频',
  document: '文档',
  sheet: '表格',
  slide: '演示文稿',
  archive: '压缩包',
  other: '文件',
}
const previewLabel = computed(() => KIND_LABEL[previewing.value?.file_type] || '文件')

const form = reactive({
  title: '',
  description: '',
  category_id: '',
  course_id: '',
  version: '',
  visibility: 'internal',
  projects: [],
  mode: 'file', // 'file' | 'link'
  linkUrl: '',
  linkType: 'video',
})

const canSubmit = computed(() => {
  if (saving.value) return false
  if (editing.value) return true
  if (form.mode === 'link') return /^https?:\/\//i.test(form.linkUrl?.trim() || '')
  return !!selectedFile.value
})

async function loadCategories() {
  try {
    const [list, cnt] = await Promise.all([listCategories(), categoryCounts()])
    categories.value = list
    counts.value = cnt
    totalCount.value = Object.values(cnt).reduce((a, b) => a + b, 0)
  } catch (err) {
    toast.error(err.message)
  }
}

async function loadResources() {
  loading.value = true
  try {
    // 项目筛选与标签筛选共用 tag 参数（项目以项目枚举值作为标签存储）
    const { items, total: count } = await listResources({
      ...filters,
      tag: filters.tag || filters.project,
      page: page.value,
      pageSize,
    })
    resources.value = items
    total.value = count
  } catch (err) {
    toast.error(err.message)
    resources.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadTagStats() {
  try {
    tagStats.value = await listTagStats()
  } catch {
    // 忽略标签统计失败，不影响主列表
  }
}

async function loadTop() {
  try {
    topList.value = await topResources(5)
  } catch {
    // 忽略
  }
}

async function loadOptions() {
  try {
    courseOptions.value = await listCourseOptions()
  } catch {
    // 忽略
  }
}

function applyFilters() {
  page.value = 1
  loadResources()
}

function resetFilters() {
  filters.keyword = ''
  filters.categoryId = ''
  filters.fileType = ''
  filters.project = ''
  filters.tag = ''
  filters.sort = 'newest'
  applyFilters()
}

function setCategory(id) {
  filters.categoryId = id
  applyFilters()
}

/** 项目与标签互斥（都映射到 tags 过滤） */
function onProjectChange() {
  if (filters.project) filters.tag = ''
  applyFilters()
}

function toggleTag(name) {
  filters.tag = filters.tag === name ? '' : name
  if (filters.tag) filters.project = ''
  applyFilters()
}

function toggleProject(value) {
  const idx = form.projects.indexOf(value)
  if (idx >= 0) form.projects.splice(idx, 1)
  else form.projects.push(value)
}

function openUpload() {
  editing.value = null
  formError.value = ''
  selectedFile.value = null
  progress.value = 0
  tagsInput.value = ''
  Object.assign(form, {
    title: '',
    description: '',
    category_id: filters.categoryId || '',
    course_id: '',
    version: '',
    visibility: 'internal',
    projects: [],
    mode: 'file',
    linkUrl: '',
    linkType: 'video',
  })
  formOpen.value = true
}

function openEdit(res) {
  editing.value = res
  formError.value = ''
  selectedFile.value = null
  progress.value = 0
  const tags = res.tags || []
  const projects = tags.filter(isCubeProject)
  tagsInput.value = tags.filter((t) => !isCubeProject(t)).join(', ')
  Object.assign(form, {
    title: res.title,
    description: res.description || '',
    category_id: res.category_id || '',
    course_id: res.course_id || '',
    version: res.version || '',
    visibility: res.visibility || 'internal',
    projects: [...projects],
    mode: isLinkResource(res) ? 'link' : 'file',
    linkUrl: isLinkResource(res) ? res.file_path : '',
    linkType: isLinkResource(res) ? res.file_type : 'video',
  })
  formOpen.value = true
}

function handleFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  pickFile(file)
}

function handleDrop(event) {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) pickFile(file)
}

function pickFile(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    formError.value = `单个文件不能超过 ${MAX_UPLOAD_LABEL}`
    return
  }
  formError.value = ''
  selectedFile.value = file
  if (!form.title) form.title = file.name.replace(/\.[^.]+$/, '')
}

async function submit() {
  formError.value = ''
  const isLinkMode = form.mode === 'link'
  const linkUrl = form.linkUrl?.trim() || ''

  if (isLinkMode && !/^https?:\/\//i.test(linkUrl)) {
    formError.value = '请填写以 http:// 或 https:// 开头的有效链接'
    return
  }

  const payload = {
    title: form.title?.trim(),
    description: form.description?.trim() || null,
    category_id: form.category_id || null,
    course_id: form.course_id || null,
    version: form.version?.trim() || null,
    visibility: form.visibility,
    // 项目标签 + 普通标签合并去重（项目以项目枚举值作为标签存储）
    tags: [
      ...form.projects,
      ...tagsInput.value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter((t) => t && !isCubeProject(t)),
    ].filter((v, i, arr) => arr.indexOf(v) === i),
  }

  saving.value = true
  progress.value = 0
  try {
    if (editing.value) {
      const patch = { ...payload }
      if (isLinkMode) {
        // 链接型资源：把外部地址写回 file_path
        patch.bucket = 'link'
        patch.file_path = linkUrl
        patch.file_name = linkUrl
        patch.file_type = form.linkType
        patch.file_size = 0
      }
      await updateResource(editing.value.id, patch)
      toast.success('资源信息已保存')
    } else if (isLinkMode) {
      await createLinkResource({ ...payload, url: linkUrl, file_type: form.linkType })
      toast.success('链接资源已添加')
    } else {
      await uploadResource(selectedFile.value, payload, (p) => {
        progress.value = p
      })
      toast.success('资源上传成功')
    }
    formOpen.value = false
    await Promise.all([loadResources(), loadCategories(), loadTop(), loadTagStats()])
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove(res) {
  const ok = await dialog.confirm({
    title: '删除资源',
    message: `确认删除「${res.title}」吗？文件与其下载记录会一并删除。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteResource(res)
    toast.success('资源已删除')
    await Promise.all([loadResources(), loadCategories(), loadTop(), loadTagStats()])
  } catch (err) {
    toast.error(err.message)
  }
}

async function download(res) {
  downloadingId.value = res.id
  try {
    const url = await downloadResource(res)
    window.open(url, '_blank', 'noopener')
    res.download_count = (res.download_count || 0) + 1
    toast.success('下载已开始')
  } catch (err) {
    toast.error(err.message)
  } finally {
    downloadingId.value = null
  }
}

function fileExt(name = '') {
  return (name.split('.').pop() || '').toLowerCase()
}

/** 统一入口：链接型资源直接打开外部地址，文件型资源走站内预览 */
function openResource(res) {
  if (isLinkResource(res)) {
    window.open(res.file_path, '_blank', 'noopener')
    return
  }
  openPreview(res)
}

async function copyLink(res) {
  try {
    await navigator.clipboard.writeText(res.file_path)
    toast.success('链接已复制')
  } catch {
    toast.error('复制失败，请手动复制')
  }
}

const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']
const TEXT_EXTS = ['txt', 'md']

/**
 * 是否移动端 / 触屏环境。
 * 移动端浏览器普遍无法在 iframe 内渲染 PDF（iOS 白屏、Android 触发下载），
 * 因此 PDF 在移动端改为交给系统阅读器打开。
 */
function isMobileEnv() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone|HarmonyOS|MicroMessenger/i.test(ua)) return true
  return (navigator.maxTouchPoints || 0) > 1 && window.innerWidth <= 900
}

async function openPreview(res) {
  previewing.value = res
  previewOpen.value = true
  previewLoading.value = true
  previewKind.value = 'other'
  previewSrc.value = ''
  previewText.value = ''
  const ext = fileExt(res.file_name)
  try {
    const kind = res.file_type
    // 音频文件在 detectFileKind 里被归入 video，这里单独识别
    if (kind === 'image' || kind === 'pdf' || kind === 'video' || AUDIO_EXTS.includes(ext)) {
      const url = await previewUrl(res)
      // 移动端 PDF：不走 iframe，直接调用系统阅读器
      if (kind === 'pdf' && isMobileEnv()) {
        const win = window.open(url, '_blank', 'noopener')
        if (win) {
          // 已成功打开，无需站内弹窗
          previewOpen.value = false
          previewing.value = null
          return
        }
        // 被浏览器拦截：退化为「手动点击打开」面板
        previewKind.value = 'pdf-mobile'
        previewSrc.value = url
        return
      }
      previewKind.value = AUDIO_EXTS.includes(ext) ? 'audio' : kind
      previewSrc.value = url
    } else if (kind === 'document' && TEXT_EXTS.includes(ext)) {
      previewKind.value = 'text'
      const url = await previewUrl(res)
      const resp = await fetch(url)
      previewText.value = await resp.text()
    } else {
      // 不支持内联预览的类型：仍生成链接，供「新窗口打开」兜底
      previewKind.value = 'other'
      previewSrc.value = await previewUrl(res)
    }
  } catch (err) {
    toast.error(err.message)
    previewKind.value = 'other'
  } finally {
    previewLoading.value = false
  }
}

function openRaw() {
  if (previewSrc.value) window.open(previewSrc.value, '_blank', 'noopener')
}

// ---------------------------------------------------------------------------
// 分类管理
// ---------------------------------------------------------------------------
async function addCategory() {
  const name = newCategory.value.trim()
  if (!name) return
  addingCategory.value = true
  try {
    await createCategory({
      name,
      slug: null,
      color: '#3366ff',
      sort_order: (categories.value.length + 1) * 10,
    })
    newCategory.value = ''
    toast.success('分类已新增')
    await loadCategories()
  } catch (err) {
    toast.error(err.message)
  } finally {
    addingCategory.value = false
  }
}

async function saveCategory(cat) {
  catSaving.value = cat.id
  try {
    await updateCategory(cat.id, {
      name: cat.name.trim(),
      color: cat.color,
      sort_order: Number(cat.sort_order) || 100,
    })
    toast.success('分类已保存')
    await loadCategories()
  } catch (err) {
    toast.error(err.message)
  } finally {
    catSaving.value = null
  }
}

async function removeCategory(cat) {
  const ok = await dialog.confirm({
    title: '删除分类',
    message: `确认删除分类「${cat.name}」吗？该分类下的资源会变为「未分类」，文件不会丢失。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCategory(cat.id)
    toast.success('分类已删除')
    if (filters.categoryId === cat.id) filters.categoryId = ''
    await Promise.all([loadCategories(), loadResources()])
  } catch (err) {
    toast.error(err.message)
  }
}

watch(page, loadResources)

onMounted(() => {
  // 支持从学员档案「查看全部」带项目参数进入
  const qp = route.query.project
  if (qp && CUBE_PROJECTS.some((p) => p.value === qp)) filters.project = qp
  loadCategories()
  loadResources()
  loadTop()
  loadOptions()
  loadTagStats()
})
</script>

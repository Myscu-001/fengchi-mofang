/** 业务字典：状态文案与配色（配合 Tailwind 类名使用） */

/**
 * 单个资源文件的上传上限。
 * 受 Supabase 套餐限制：免费版 storage.max_file_size = 50MB 且不可调整
 * （提升需升级付费计划）。这里作为前端唯一口径，同时 storage.buckets
 * 的 file_size_limit 与 supabase/03_policies.sql 也保持一致。
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '50MB'

export const COURSE_STATUS = {
  draft: { label: '草稿', style: 'bg-ink-100 text-ink-600 border-ink-200', dot: 'bg-ink-400' },
  published: { label: '已上架', style: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  archived: { label: '已归档', style: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
}

export const COURSE_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已上架' },
  { value: 'archived', label: '已归档' },
]

export const STUDENT_STATUS = {
  active: { label: '在读', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { label: '停课', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  graduated: { label: '结业', style: 'bg-brand-50 text-brand-700 border-brand-200' },
  left: { label: '退学', style: 'bg-ink-100 text-ink-600 border-ink-200' },
}

export const STUDENT_STATUS_OPTIONS = [
  { value: 'active', label: '在读' },
  { value: 'paused', label: '停课' },
  { value: 'graduated', label: '结业' },
  { value: 'left', label: '退学' },
]

export const FILE_KIND = {
  document: { label: '文档', icon: 'FileText', style: 'bg-brand-50 text-brand-700 border-brand-200' },
  pdf: { label: 'PDF', icon: 'FileType', style: 'bg-red-50 text-red-600 border-red-200' },
  sheet: { label: '表格', icon: 'Sheet', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  slide: { label: '演示', icon: 'Presentation', style: 'bg-orange-50 text-orange-600 border-orange-200' },
  image: { label: '图片', icon: 'Image', style: 'bg-violet-50 text-violet-700 border-violet-200' },
  video: { label: '音视频', icon: 'Video', style: 'bg-pink-50 text-pink-600 border-pink-200' },
  archive: { label: '压缩包', icon: 'Archive', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  other: { label: '其他', icon: 'File', style: 'bg-ink-100 text-ink-600 border-ink-200' },
}

export const FILE_KIND_OPTIONS = Object.entries(FILE_KIND).map(([value, v]) => ({
  value,
  label: v.label,
}))

export const STUDENT_LEVEL_OPTIONS = ['新手', '入门', '熟练', '竞速']

/**
 * 魔方项目字典。学员成绩按项目独立存储与统计。
 * value 与数据库 cube_project 枚举保持一致；color 用于成绩趋势图与标识。
 */
export const CUBE_PROJECTS = [
  { value: '2x2', label: '二阶', short: '2×2', color: '#EA625F' },
  { value: '3x3', label: '三阶', short: '3×3', color: '#F2A024' },
  { value: '4x4', label: '四阶', short: '4×4', color: '#34B4E2' },
  { value: '5x5', label: '五阶', short: '5×5', color: '#9B6FE0' },
  { value: 'pyraminx', label: '金字塔', short: 'PYRA', color: '#93BC37' },
  { value: 'skewb', label: '斜转', short: 'SKEWB', color: '#E8709A' },
]

export function cubeProjectMeta(value) {
  return CUBE_PROJECTS.find((p) => p.value === value) || null
}

/** 课程难度 1-5 */
export const LEVEL_LABELS = ['', '兴趣启蒙', '基础入门', '熟练应用', '进阶提速', '竞技特训']

export function levelLabel(v) {
  return LEVEL_LABELS[Number(v)] || '—'
}

export const LEVEL_OPTIONS = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: `${v} · ${LEVEL_LABELS[v]}` }))

export const COURSE_CATEGORY_OPTIONS = [
  // 魔方线
  '启蒙', '入门', '进阶', '提速', '高阶', '赛事', '专项',
  // 桌游线
  '初级', '中级', '高级',
]

/**
 * 课程线。机构的课程体系分为「魔方」与「博弈桌游」两条线，
 * 配色对应 LOGO 立方体上的两个面（红 / 绿）。
 */
export const TRACKS = [
  {
    value: '魔方',
    label: '魔方课程',
    short: '魔方',
    color: '#E8564F',
    deepColor: '#C43B36',
    description: '从认知启蒙到竞速盲拧，由浅入深、循序渐进',
  },
  {
    value: '桌游',
    label: '博弈桌游',
    short: '桌游',
    color: '#93BC37',
    deepColor: '#5F821F',
    description: '在规则与博弈中建立策略思维与协作能力',
  },
]

export const TRACK_OPTIONS = TRACKS.map((t) => ({ value: t.value, label: t.label }))

export function trackMeta(value) {
  return TRACKS.find((t) => t.value === value) || null
}

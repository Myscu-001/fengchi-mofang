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

/** 全部魔方项目的枚举值（顺序与 CUBE_PROJECTS 一致） */
export const CUBE_PROJECT_VALUES = CUBE_PROJECTS.map((p) => p.value)

/** 判断某个标签是否代表「适用魔方项目」（资源以项目枚举值作为标签存储） */
export function isCubeProject(value) {
  return CUBE_PROJECT_VALUES.includes(value)
}

/**
 * 魔方段位（里程碑）体系「默认阈值」。
 * 注意：段位现已支持后台「站点配置」可视化编辑，管理员保存后以
 * site_settings 的 cube.ranks 为准；此处仅作为未配置时的兜底默认值。
 * 运行时读取请使用 @/lib/ranks 中的 rankForProject / nextRank / rankTiers。
 * tiers 由易到难排列；max 为达到该段位所需的 Ao5 秒数上限（越小越难）。
 */
export const CUBE_RANKS = {
  '2x2': [
    { key: 'r1', label: '入阶', max: 8, color: '#93BC37' },
    { key: 'r2', label: '进阶', max: 5, color: '#34B4E2' },
    { key: 'r3', label: '竞速', max: 3, color: '#EA625F' },
  ],
  '3x3': [
    { key: 'r1', label: '入阶', max: 40, color: '#93BC37' },
    { key: 'r2', label: '熟练', max: 30, color: '#F2A024' },
    { key: 'r3', label: '提速', max: 20, color: '#34B4E2' },
    { key: 'r4', label: '竞速', max: 15, color: '#9B6FE0' },
    { key: 'r5', label: '大师', max: 10, color: '#EA625F' },
  ],
  '4x4': [
    { key: 'r1', label: '入阶', max: 120, color: '#93BC37' },
    { key: 'r2', label: '熟练', max: 90, color: '#F2A024' },
    { key: 'r3', label: '竞速', max: 60, color: '#EA625F' },
  ],
  '5x5': [
    { key: 'r1', label: '入阶', max: 240, color: '#93BC37' },
    { key: 'r2', label: '熟练', max: 180, color: '#F2A024' },
    { key: 'r3', label: '竞速', max: 120, color: '#EA625F' },
  ],
  pyraminx: [
    { key: 'r1', label: '入阶', max: 15, color: '#93BC37' },
    { key: 'r2', label: '熟练', max: 10, color: '#F2A024' },
    { key: 'r3', label: '竞速', max: 7, color: '#9B6FE0' },
    { key: 'r4', label: '大师', max: 5, color: '#EA625F' },
  ],
  skewb: [
    { key: 'r1', label: '入阶', max: 12, color: '#93BC37' },
    { key: 'r2', label: '熟练', max: 8, color: '#F2A024' },
    { key: 'r3', label: '竞速', max: 5, color: '#9B6FE0' },
    { key: 'r4', label: '大师', max: 3, color: '#EA625F' },
  ],
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

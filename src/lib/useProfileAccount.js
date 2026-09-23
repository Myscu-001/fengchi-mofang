import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { listPermissions } from '@/api/users'
import { listErrors, clearErrors } from '@/lib/monitor'

const MODULE_LABELS = {
  system: '系统管理',
  course: '课程管理',
  student: '学员管理',
  class: '班级管理',
  grade: '成绩管理',
  resource: '资源管理',
}

/**
 * 个人中心的资料 / 密码 / 权限 / 诊断日志逻辑。
 *
 * 抽出来是因为它有 6 个使用方：桌面端的 ProfileView（一整页铺开）和手机端的 5 个子页面
 * （个人资料 / 修改密码 / 账号与安全 / 我的权限 / 诊断日志）。不抽就要复制 6 份。
 * 每次调用都会新建一份状态 —— 子页面各自独立，进页面时 load() 重新对齐最新数据。
 */
export function useProfileAccount() {
  const auth = useAuthStore()
  const toast = useToastStore()

  const uploadingAvatar = ref(false)
  const savingProfile = ref(false)
  const savingPwd = ref(false)
  const savedAt = ref('')
  const showPwd = ref(false)
  const pwdError = ref('')
  const allPermissions = ref([])
  const errorLogs = ref([])
  let permsLoaded = false

  const profileForm = reactive({ full_name: '', title: '', phone: '', bio: '' })
  const pwdForm = reactive({ password: '', confirm: '' })

  const permissionList = computed(() =>
    allPermissions.value
      .filter((p) => auth.permissions.includes(p.code))
      .map((p) => ({ ...p, moduleLabel: MODULE_LABELS[p.module] || p.module })),
  )

  function fillProfileForm() {
    profileForm.full_name = auth.profile?.full_name || ''
    profileForm.title = auth.profile?.title || ''
    profileForm.phone = auth.profile?.phone || ''
    profileForm.bio = auth.profile?.bio || ''
  }

  function refreshLogs() {
    errorLogs.value = listErrors()
  }

  /** 进页面时统一调用：资料表单对齐最新、权限只拉一次、日志取本机最新 */
  async function load() {
    fillProfileForm()
    refreshLogs()
    if (permsLoaded) return
    try {
      allPermissions.value = await listPermissions()
      permsLoaded = true
    } catch {
      allPermissions.value = []
    }
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('头像不能超过 2MB')
      return
    }
    uploadingAvatar.value = true
    try {
      await auth.uploadAvatar(file)
      toast.success('头像已更新')
    } catch (err) {
      toast.error(err.message)
    } finally {
      uploadingAvatar.value = false
    }
  }

  async function saveProfile() {
    if (!profileForm.full_name.trim()) {
      toast.error('请填写姓名')
      return
    }
    savingProfile.value = true
    try {
      await auth.updateProfile({
        full_name: profileForm.full_name.trim(),
        title: profileForm.title?.trim() || null,
        phone: profileForm.phone?.trim() || null,
        bio: profileForm.bio?.trim() || null,
      })
      toast.success('资料已保存')
      savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      savingProfile.value = false
    }
  }

  async function savePassword() {
    pwdError.value = ''
    if (pwdForm.password.length < 8) {
      pwdError.value = '密码长度至少 8 位'
      return
    }
    if (pwdForm.password !== pwdForm.confirm) {
      pwdError.value = '两次输入的密码不一致'
      return
    }
    savingPwd.value = true
    try {
      await auth.changePassword(pwdForm.password)
      pwdForm.password = ''
      pwdForm.confirm = ''
      toast.success('密码已更新')
    } catch (err) {
      pwdError.value = err.message
    } finally {
      savingPwd.value = false
    }
  }

  function copyLogs() {
    const text = errorLogs.value
      .map(
        (e, i) =>
          `#${i + 1} ${e.time}\n页面：${e.route}\n信息：${e.message}\n${e.info ? '位置：' + e.info + '\n' : ''}${e.stack || ''}`,
      )
      .join('\n\n')
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('诊断日志已复制'))
      .catch(() => toast.error('复制失败，请手动选择文本'))
  }

  function clearLogs() {
    clearErrors()
    refreshLogs()
    toast.success('诊断日志已清空')
  }

  return {
    auth,
    profileForm,
    pwdForm,
    uploadingAvatar,
    savingProfile,
    savingPwd,
    savedAt,
    showPwd,
    pwdError,
    errorLogs,
    permissionList,
    load,
    fillProfileForm,
    refreshLogs,
    handleAvatar,
    saveProfile,
    savePassword,
    copyLogs,
    clearLogs,
  }
}

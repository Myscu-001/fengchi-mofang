/**
 * 客户端图片压缩。
 *
 * 为什么需要：老师常用手机 / 平板现拍照片当学员头像，原图动辄好几 MB，
 * 直接上传会撞上 avatars 桶 2MB 的上限而失败。这里先压到合格再传，
 * 顺带把长边统一缩到头像够用的尺寸，省流也省存储空间。
 */

const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.48]

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片无法读取，请换一张试试'))
    }
    img.src = url
  })
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * 把图片压缩到 maxBytes 以内、长边不超过 maxEdge。
 * 已经达标的图片原样返回，不做无谓的重编码（也顺带保住 PNG 的透明底）。
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}) {
  const { maxEdge = 512, maxBytes = 2 * 1024 * 1024 } = options

  if (!file) throw new Error('没有选择图片')
  if (!/^image\//.test(file.type)) throw new Error('请选择图片文件')

  const img = await loadImage(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) throw new Error('图片尺寸异常，请换一张试试')

  if (file.size <= maxBytes && w <= maxEdge && h <= maxEdge) return file

  const scale = Math.min(1, maxEdge / Math.max(w, h))
  let targetW = Math.max(1, Math.round(w * scale))
  let targetH = Math.max(1, Math.round(h * scale))

  // 先按质量降档；仍然超就再缩一档尺寸重来一轮
  for (let round = 0; round < 2; round++) {
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    // 铺白底：PNG 透明区域转 JPEG 后否则会变黑
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
    ctx.drawImage(img, 0, 0, targetW, targetH)

    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(canvas, quality)
      if (blob && blob.size <= maxBytes) {
        const base = String(file.name || 'avatar').replace(/\.[^.]+$/, '') || 'avatar'
        return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
      }
    }

    targetW = Math.max(1, Math.round(targetW * 0.7))
    targetH = Math.max(1, Math.round(targetH * 0.7))
  }

  throw new Error('图片压缩后仍然过大，请换一张小一点的图片')
}

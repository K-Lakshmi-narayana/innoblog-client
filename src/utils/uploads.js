import { apiRequest, resolveImageUrl } from '../api'

export async function uploadImageFile(file, kind = 'article') {
  const formData = new FormData()
  formData.append('image', file)

  const endpoint = kind === 'cover' ? '/uploads/cover' : '/uploads/article-image'
  const data = await apiRequest(endpoint, {
    method: 'POST',
    body: formData,
    timeout: 60000,
  })

  const image = data.image || {}

  return {
    ...image,
    url: resolveImageUrl(image.url || image.path || ''),
  }
}

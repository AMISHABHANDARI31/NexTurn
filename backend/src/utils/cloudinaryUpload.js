import cloudinary from '../config/cloudinary.js'

export function uploadImageBuffer(buffer, folder = 'nexturn/locations') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder,
      resource_type: 'image',
      transformation: [{ width: 1600, height: 1000, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
    }, (error, result) => error ? reject(error) : resolve(result))
    stream.end(buffer)
  })
}

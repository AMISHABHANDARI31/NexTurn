import multer from 'multer'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const uploadLocationImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(Object.assign(new Error('Upload a JPEG, PNG, or WebP image.'), { status: 400, code: 'INVALID_IMAGE_TYPE' }))
    callback(null, true)
  },
}).single('image')

export const uploadBranchAsset = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(Object.assign(new Error('Upload a JPEG, PNG, or WebP image.'), { status: 400, code: 'INVALID_IMAGE_TYPE' }))
    callback(null, true)
  },
}).single('scheduleImage')

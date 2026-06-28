export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} was not found` })
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  const isUploadError = error.name === 'MulterError'
  res.status(error.status || (isUploadError ? 400 : 500)).json({
    success: false,
    error: {
      code: isUploadError ? 'UPLOAD_ERROR' : error.code || 'INTERNAL_ERROR',
      message: error.status || isUploadError ? error.message : 'An unexpected server error occurred',
    },
  })
}

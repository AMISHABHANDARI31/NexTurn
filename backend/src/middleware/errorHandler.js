import { logger } from '../logging/logger.js'

export function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found` } })
}

export function errorHandler(error, req, res, _next) {
  logger.error({
    event: 'API_ERROR',
    method: req.method,
    path: req.originalUrl,
    code: error.code || error.name || 'INTERNAL_ERROR',
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  })
  const isUploadError = error.name === 'MulterError'
  const isFileTooLarge = isUploadError && error.code === 'LIMIT_FILE_SIZE'
  const isSyntaxError = error instanceof SyntaxError && 'body' in error
  const status = error.status || (isFileTooLarge ? 413 : isUploadError ? 400 : isSyntaxError ? 400 : 500)
  const safeMessage = status >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong' : (isSyntaxError ? 'Invalid JSON payload.' : error.message)
  res.status(status).json({
    success: false,
    error: {
      code: isUploadError ? 'UPLOAD_ERROR' : isSyntaxError ? 'INVALID_JSON' : error.code || 'INTERNAL_ERROR',
      message: isFileTooLarge ? 'Uploaded file is too large.' : safeMessage,
    },
  })
}

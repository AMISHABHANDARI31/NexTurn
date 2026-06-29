export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query })
  if (!result.success) {
    const fields = {}
    result.error.issues.forEach((issue) => {
      const [, field = 'request'] = issue.path
      fields[field] = issue.message
    })
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data.',
        fields,
      },
    })
  }
  req.validated = result.data
  next()
}

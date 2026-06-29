export function validationError(fields = {}, message = 'Invalid input data.') {
  return Object.assign(new Error(message), { status: 400, code: 'VALIDATION_ERROR', fields })
}

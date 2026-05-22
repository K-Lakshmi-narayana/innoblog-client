/**
 * Extract user-friendly error message from various error sources
 */
export function getUserFriendlyError(error) {
  if (!error) return 'An unexpected error occurred.'

  // If error has a message property, use it
  if (error.message) {
    const message = String(error.message)

    // Filter out technical MongoDB validation messages
    if (message.includes('Path `') && message.includes('is longer than')) {
      const fieldMatch = message.match(/Path `([^`]+)`/)
      if (fieldMatch) {
        const field = fieldMatch[1]
        const lengthMatch = message.match(/length (\d+).*?(\d+)/)
        if (lengthMatch) {
          const maxLength = lengthMatch[2]
          return `${field.charAt(0).toUpperCase() + field.slice(1)} must not exceed ${maxLength} characters.`
        }
      }
      return 'Input is too long. Please check the character limit.'
    }

    // Filter out other technical MongoDB errors
    if (message.includes('Cast to ObjectId failed')) {
      return 'Invalid ID format. Please try again.'
    }

    if (message.includes('E11000 duplicate key')) {
      return 'This entry already exists. Please use a different value.'
    }

    // Return the message as-is if it looks like a user-friendly message
    if (
      !message.includes('Cast to') &&
      !message.includes('Path `') &&
      !message.includes('$') &&
      !message.includes('__')
    ) {
      return message
    }
  }

  // If error has a code property, map it to a friendly message
  if (error.code) {
    const codeMessages = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      UNAUTHORIZED: 'You are not authorized to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      CONFLICT: 'This resource already exists.',
      INTERNAL_SERVER_ERROR: 'An unexpected server error occurred. Please try again.',
    }
    return codeMessages[error.code] || 'An error occurred. Please try again.'
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Map error codes to user-friendly messages
 */
export const errorCodeMessages = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'This resource already exists.',
  INTERNAL_SERVER_ERROR: 'An unexpected server error occurred. Please try again.',
}

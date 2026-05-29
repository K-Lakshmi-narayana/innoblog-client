import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Renders LaTeX math in a given HTML string
 * Supports both inline ($...$) and display ($$...$$) math
 */
export function renderMathInHtml(htmlString) {
  if (!htmlString) return htmlString

  let html = htmlString

  // First, process display math ($$...$$) - must be done before inline
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    const trimmedLatex = latex.trim()
    if (!trimmedLatex) return match

    try {
      const rendered = katex.renderToString(trimmedLatex, {
        throwOnError: false,
        displayMode: true,
      })
      return `<math-display data-latex="${escapeHtml(trimmedLatex)}">${rendered}</math-display>`
    } catch (error) {
      console.error('Failed to render display math:', trimmedLatex, error)
      return `<math-error>Invalid LaTeX: ${escapeHtml(trimmedLatex)}</math-error>`
    }
  })

  // Then process inline math ($...$) - careful not to match $$ boundaries
  // This regex finds $ followed by content (not containing $) followed by $
  // and uses negative lookbehind/lookahead to avoid $$ patterns
  html = html.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (match, latex) => {
    const trimmedLatex = latex.trim()

    // Skip if empty or just whitespace or single character
    if (!trimmedLatex || trimmedLatex.length < 1) return match

    try {
      const rendered = katex.renderToString(trimmedLatex, {
        throwOnError: false,
        displayMode: false,
      })
      return `<math-inline data-latex="${escapeHtml(trimmedLatex)}">${rendered}</math-inline>`
    } catch (error) {
      console.error('Failed to render inline math:', trimmedLatex, error)
      return match // Return original on error
    }
  })

  return html
}

/**
 * Escape HTML special characters for safe attribute values
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default renderMathInHtml

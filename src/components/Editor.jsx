import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  useEditor,
} from '@tiptap/react'
import { Extension, Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import CodeBlock from '@tiptap/extension-code-block'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Blockquote from '@tiptap/extension-blockquote'
import DeferredMonacoEditor from './DeferredMonacoEditor'
import { Math as MathExtension } from '../extensions/Math'
import {
  FaBold,
  FaItalic,
  FaQuoteLeft,
  FaListUl,
  FaListOl,
  FaCode,
  FaLink,
  FaPalette,
  FaImage,
  FaTable,
  FaMinus,
  FaHeading,
  FaPlus,
  FaTrash,
  FaCompress,
  FaExpand,
  FaSquareRootAlt,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import {
  ARTICLE_IMAGE_LIMITS,
  formatFileSize,
  validateImageFile,
} from '../utils/validations'
import { uploadImageFile } from '../utils/uploads'
import { getUserFriendlyError } from '../utils/errorMessages'
import { resolveImageUrl } from '../api'

function ToolbarButton({ active = false, icon, label, onClick, colorIndicator }) {
  return (
    <button
      className={`toolbar-button ${active ? 'is-active' : ''}`}
      type="button"
      onClick={onClick}
      title={label}
    >
      {icon && <span className="toolbar-icon">{icon}</span>}
      <span className="toolbar-text">{label}</span>
      {colorIndicator && (
        <div
          className="color-indicator"
          style={{ backgroundColor: colorIndicator }}
        />
      )}
    </button>
  )
}

const IMAGE_ALIGNMENTS = ['left', 'center', 'right']

function normalizeImageAlignment(value) {
  return IMAGE_ALIGNMENTS.includes(value) ? value : 'left'
}

function normalizeCarouselImages(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((image) => ({
        src: resolveImageUrl(String(image?.src || '').trim()),
        alt: String(image?.alt || '').trim(),
      }))
      .filter((image) => image.src)
  }

  try {
    return normalizeCarouselImages(JSON.parse(value))
  } catch {
    return []
  }
}

function parseDimension(value, fallback, min = 160, max = 1200) {
  const parsedValue = Number.parseInt(String(value || ''), 10)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(min, Math.min(max, parsedValue))
}

function getCurrentCodeEditorTheme() {
  if (typeof document === 'undefined') {
    return 'vs'
  }

  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs'
}

function useCodeEditorTheme() {
  const [theme, setTheme] = useState(getCurrentCodeEditorTheme)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    function syncTheme() {
      setTheme(getCurrentCodeEditorTheme())
    }

    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => observer.disconnect()
  }, [])

  return theme
}

function ResizableImageComponent({ node, updateAttributes, selected, deleteNode }) {
  const [size, setSize] = useState({
    width: node.attrs.width || 520,
    height: node.attrs.height || null,
  })
  const [position, setPosition] = useState({
    floatPosition: normalizeImageAlignment(node.attrs.floatPosition),
  })
  const containerRef = useRef(null)
  const dragState = useRef({ 
    mode: null, // 'resize' or 'drag'
    startX: 0, 
    startY: 0, 
    width: 0, 
    height: 0,
    axis: null 
  })

  useEffect(() => {
    function handleMouseMove(event) {
      if (!dragState.current.mode) {
        return
      }

      if (dragState.current.mode === 'resize') {
        const dx = event.clientX - dragState.current.startX
        const dy = event.clientY - dragState.current.startY
        let nextWidth = dragState.current.width
        let nextHeight = dragState.current.height

        if (dragState.current.axis === 'horizontal' || dragState.current.axis === 'both') {
          nextWidth = Math.max(140, dragState.current.width + dx)
        }

        if (dragState.current.axis === 'vertical' || dragState.current.axis === 'both') {
          nextHeight = Math.max(100, dragState.current.height + dy)
        }

        updateAttributes({ width: nextWidth, height: nextHeight })
        setSize({ width: nextWidth, height: nextHeight })
      }
    }

    function handleMouseUp() {
      if (!dragState.current.mode) {
        return
      }

      dragState.current.mode = null
      dragState.current.axis = null
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [updateAttributes])

  function startResize(axis, event) {
    event.preventDefault()
    const canvas = containerRef.current
    dragState.current = {
      mode: 'resize',
      axis,
      startX: event.clientX,
      startY: event.clientY,
      width: canvas?.offsetWidth || (node.attrs.width || 520),
      height: canvas?.offsetHeight || (node.attrs.height || 320),
    }
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const normalizedWidth = node.attrs.width || null
    const normalizedHeight = node.attrs.height || null

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSize({
      width: normalizedWidth,
      height: normalizedHeight,
    })
  }, [node.attrs.width, node.attrs.height])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosition({
      floatPosition: normalizeImageAlignment(node.attrs.floatPosition),
    })
  }, [node.attrs.floatPosition])

  const imageAlignment = normalizeImageAlignment(position.floatPosition)

  return (
    <NodeViewWrapper
      className={`image-node image-node--${imageAlignment}${selected ? ' is-selected' : ''}`}
      data-align={imageAlignment}
    >
      <div
        className="image-frame"
        ref={containerRef}
        style={{
          width: size.width ? `${size.width}px` : 'auto',
          height: size.height ? `${size.height}px` : 'auto',
          maxWidth: '100%',
        }}
      >
        {node.attrs.src && (
          <img src={resolveImageUrl(node.attrs.src)} alt={node.attrs.alt || 'Image'} />
        )}
        <button
          type="button"
          className="resize-handle resize-handle--left"
          onMouseDown={(event) => startResize('horizontal', event)}
          aria-label="Resize image horizontally"
        />
        <button
          type="button"
          className="resize-handle resize-handle--right"
          onMouseDown={(event) => startResize('horizontal', event)}
          aria-label="Resize image horizontally"
        />
        <button
          type="button"
          className="resize-handle resize-handle--top"
          onMouseDown={(event) => startResize('vertical', event)}
          aria-label="Resize image vertically"
        />
        <button
          type="button"
          className="resize-handle resize-handle--bottom"
          onMouseDown={(event) => startResize('vertical', event)}
          aria-label="Resize image vertically"
        />
        <button
          type="button"
          className="resize-handle resize-handle--corner"
          onMouseDown={(event) => startResize('both', event)}
          aria-label="Resize image diagonally"
        />
        {selected && (
          <button
            type="button"
            className="delete-handle"
            onClick={deleteNode}
            aria-label="Delete image"
          >
            <FaTrash />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      floatPosition: {
        default: 'left',
        parseHTML: element => normalizeImageAlignment(
          element.getAttribute('data-align') ||
          element.getAttribute('data-float') ||
          element.style.textAlign ||
          'left',
        ),
        renderHTML: attributes => {
          const floatValue = normalizeImageAlignment(attributes.floatPosition)
          return {
            'data-align': floatValue,
            'data-float': floatValue,
          }
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },
})

function ImageCarouselComponent({ node, updateAttributes, selected, deleteNode }) {
  const images = normalizeCarouselImages(node.attrs.images)
  const [activeIndex, setActiveIndex] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)
  const dragState = useRef({
    axis: null,
    startX: 0,
    startY: 0,
    width: 0,
    height: 0,
  })
  const width = parseDimension(node.attrs.width, 360, 180, 900)
  const height = parseDimension(node.attrs.height, 540, 220, 1000)
  const safeActiveIndex = images.length ? Math.min(activeIndex, images.length - 1) : 0

  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(Math.max(0, images.length - 1))
    }
  }, [activeIndex, images.length])

  useEffect(() => {
    function handleMouseMove(event) {
      if (!dragState.current.width) {
        return
      }

      const deltaX = event.clientX - dragState.current.startX
      const deltaY = event.clientY - dragState.current.startY
      const nextAttributes = {}

      if (dragState.current.axis === 'horizontal' || dragState.current.axis === 'both') {
        nextAttributes.width = parseDimension(dragState.current.width + deltaX, width, 180, 900)
      }

      if (dragState.current.axis === 'vertical' || dragState.current.axis === 'both') {
        nextAttributes.height = parseDimension(dragState.current.height + deltaY, height, 220, 1000)
      }

      updateAttributes(nextAttributes)
    }

    function handleMouseUp() {
      dragState.current = {
        axis: null,
        startX: 0,
        startY: 0,
        width: 0,
        height: 0,
      }
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [height, updateAttributes, width])

  function startResize(axis, event) {
    event.preventDefault()
    dragState.current = {
      axis,
      startX: event.clientX,
      startY: event.clientY,
      width: containerRef.current?.offsetWidth || width,
      height: containerRef.current?.offsetHeight || height,
    }
    document.body.style.userSelect = 'none'
  }

  async function handleCarouselImageUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file, 'Carousel image')
    if (validationError) {
      setUploadError(validationError)
      event.target.value = ''
      return
    }

    try {
      setUploadError('')
      const image = await uploadImageFile(file, 'article')
      const insertIndex = images.length ? safeActiveIndex + 1 : 0
      const nextImage = {
        src: image.url || image.path,
        alt: file.name.replace(/\.[^.]+$/, ''),
      }
      const nextImages = [
        ...images.slice(0, insertIndex),
        nextImage,
        ...images.slice(insertIndex),
      ]
      updateAttributes({ images: nextImages })
      setActiveIndex(insertIndex)
    } catch (uploadError) {
      setUploadError(getUserFriendlyError(uploadError))
    } finally {
      event.target.value = ''
    }
  }

  function showPrevious() {
    if (!images.length) return
    setActiveIndex((index) => (index - 1 + images.length) % images.length)
  }

  function showNext() {
    if (!images.length) return
    setActiveIndex((index) => (index + 1) % images.length)
  }

  function handleDeleteCurrentImage() {
    if (!images.length) {
      return
    }

    const nextImages = images.filter((_, index) => index !== safeActiveIndex)
    updateAttributes({ images: nextImages })
    setActiveIndex(Math.max(0, Math.min(safeActiveIndex, nextImages.length - 1)))
  }

  return (
    <NodeViewWrapper className={`image-carousel-node${selected ? ' is-selected' : ''}`}>
      <div
        ref={containerRef}
        className="image-carousel-shell"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
        }}
      >
        <div className="image-carousel-editor">
        {images.length ? (
          <>
            <img
              className="image-carousel-editor__image"
              src={images[safeActiveIndex].src}
              alt={images[safeActiveIndex].alt || `Carousel image ${safeActiveIndex + 1}`}
            />
            <button
              type="button"
              className="image-carousel-arrow image-carousel-arrow--prev"
              onClick={showPrevious}
              aria-label="Previous carousel image"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              className="image-carousel-arrow image-carousel-arrow--next"
              onClick={showNext}
              aria-label="Next carousel image"
            >
              <FaChevronRight />
            </button>
            <button
              type="button"
              className="image-carousel-add"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add image after current carousel image"
            >
              <FaPlus />
            </button>
            <button
              type="button"
              className="image-carousel-delete-image"
              onClick={handleDeleteCurrentImage}
              aria-label="Delete current carousel image"
            >
              <FaTrash />
            </button>
            <div className="image-carousel-count">
              {safeActiveIndex + 1}/{images.length}
            </div>
          </>
        ) : (
          <button
            type="button"
            className="image-carousel-empty"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add carousel image"
          >
            <FaPlus />
          </button>
        )}

        <button
          type="button"
          className="resize-handle resize-handle--left"
          onMouseDown={(event) => startResize('horizontal', event)}
          aria-label="Resize image carousel horizontally"
        />
        <button
          type="button"
          className="resize-handle resize-handle--right"
          onMouseDown={(event) => startResize('horizontal', event)}
          aria-label="Resize image carousel horizontally"
        />
        <button
          type="button"
          className="resize-handle resize-handle--top"
          onMouseDown={(event) => startResize('vertical', event)}
          aria-label="Resize image carousel vertically"
        />
        <button
          type="button"
          className="resize-handle resize-handle--bottom"
          onMouseDown={(event) => startResize('vertical', event)}
          aria-label="Resize image carousel vertically"
        />
        <button
          type="button"
          className="resize-handle resize-handle--corner"
          onMouseDown={(event) => startResize('both', event)}
          aria-label="Resize image carousel"
        />

        {uploadError ? <div className="image-carousel-error">{uploadError}</div> : null}

        <input
          ref={fileInputRef}
          type="file"
          accept={ARTICLE_IMAGE_LIMITS.allowedTypes.join(',')}
          hidden
          onChange={handleCarouselImageUpload}
        />
        </div>
        {selected ? (
          <button
            type="button"
            className="delete-handle delete-handle--outside"
            onClick={deleteNode}
            aria-label="Delete carousel"
          >
            <FaTrash />
          </button>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

const ImageCarousel = Node.create({
  name: 'imageCarousel',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) => {
          const storedImages = normalizeCarouselImages(element.getAttribute('data-images'))
          if (storedImages.length) {
            return storedImages
          }

          return Array.from(element.querySelectorAll('img')).map((image, index) => ({
            src: image.getAttribute('src') || '',
            alt: image.getAttribute('alt') || `Carousel image ${index + 1}`,
          })).filter((image) => image.src)
        },
        renderHTML: () => ({}),
      },
      width: {
        default: 360,
        parseHTML: (element) => parseDimension(element.getAttribute('data-width'), 360, 180, 900),
        renderHTML: () => ({}),
      },
      height: {
        default: 540,
        parseHTML: (element) => parseDimension(element.getAttribute('data-height'), 540, 220, 1000),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-carousel"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const images = normalizeCarouselImages(node.attrs.images)
    const width = parseDimension(node.attrs.width, 360, 180, 900)
    const height = parseDimension(node.attrs.height, 540, 220, 1000)

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'image-carousel',
        'data-images': JSON.stringify(images),
        'data-width': String(width),
        'data-height': String(height),
        style: `width:${width}px;max-width:100%;height:${height}px;`,
      }),
      ...images.map((image, index) => [
        'img',
        {
          src: image.src,
          alt: image.alt || `Carousel image ${index + 1}`,
          loading: 'lazy',
          decoding: 'async',
        },
      ]),
    ]
  },

  addCommands() {
    return {
      insertImageCarousel:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              images: [],
              width: 360,
              height: 540,
            },
          }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageCarouselComponent)
  },
})

function MonacoCodeBlock({ node, updateAttributes, editor, getPos }) {
  const value = node.textContent || ''
  const language = node.attrs?.language || 'python'
  const monacoTheme = useCodeEditorTheme()
  const lines = value.split('\n').length || 1
  const height = `${Math.max(120, Math.min(800, lines * 22 + 24))}px`

  const updateNodeCode = (newValue) => {
    if (!editor || typeof getPos !== 'function') {
      return
    }

    const position = getPos()
    if (typeof position !== 'number') {
      return
    }

    // Use a more direct approach to update the node content
    const { tr } = editor.state
    const start = position + 1
    const end = position + node.nodeSize - 1

    tr.replaceWith(start, end, editor.schema.text(newValue || ''))
    editor.view.dispatch(tr)
  }

  const handleChange = (newValue) => {
    const nextValue = newValue || ''

    // Update the document immediately for copy-paste operations
    updateNodeCode(nextValue)

    // Auto-detect language from pasted content
    if (nextValue && nextValue !== value) {
      const detectedLang = detectLanguage(nextValue)
      if (detectedLang && detectedLang !== language) {
        updateAttributes({ language: detectedLang })
      }
    }
  }

  const handleLanguageChange = (newLanguage) => {
    updateAttributes({ language: newLanguage })
  }

  // Detect language from code content
  const detectLanguage = (code) => {
    if (!code) return 'python'

    // Common language patterns
    if (code.includes('import ') || code.includes('from ') || code.includes('def ') || code.includes('class ')) {
      return 'python'
    }
    if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('var ')) {
      return 'javascript'
    }
    if (code.includes('#include') || code.includes('int main') || code.includes('printf')) {
      return 'cpp'
    }
    if (code.includes('public class') || code.includes('System.out.println')) {
      return 'java'
    }
    if (code.includes('<?php') || code.includes('echo ')) {
      return 'php'
    }
    if (code.includes('<html>') || code.includes('<div>')) {
      return 'html'
    }
    if (code.includes('SELECT ') || code.includes('FROM ') || code.includes('WHERE ')) {
      return 'sql'
    }

    return 'python' // default
  }

  return (
    <NodeViewWrapper>
      <div className={`monaco-code-block monaco-code-block--${monacoTheme === 'vs-dark' ? 'dark' : 'light'}`}>
        <div className="code-block-header">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-selector"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="php">PHP</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="yaml">YAML</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        <DeferredMonacoEditor
          height={height}
          language={language}
          value={value}
          onChange={handleChange}
          theme={monacoTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}

const MonacoCodeBlockExtension = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'python',
        parseHTML: element => element.getAttribute('data-language') || 'python',
        renderHTML: attributes => {
          if (!attributes.language) {
            return {}
          }
          const language = String(attributes.language).trim() || 'python'
          return {
            'data-language': language,
            class: `language-${language}`,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(MonacoCodeBlock)
  },
})

function ResizableTable({ node, selected }) {
  const containerRef = useRef(null)

  const headerColor = node.attrs?.tableHeaderColor

  return (
    <NodeViewWrapper 
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        '--header-color': headerColor || 'transparent',
      }}
      className={`resizable-table ${selected ? 'is-selected' : ''}`}
      data-header-color={headerColor}
    >
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        backgroundColor: 'transparent'
      }}>
        <NodeViewContent as="tbody" />
      </table>
    </NodeViewWrapper>
  )
}

const ColoredTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableHeaderColor: {
        default: '#c53030',
        parseHTML: element => element.getAttribute('data-header-color') || '#c53030',
        renderHTML: attributes => {
          const headerColor = attributes.tableHeaderColor || '#c53030'

          return {
            'data-header-color': headerColor,
            style: `--header-color: ${headerColor}`,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableTable)
  },
})

const ColoredBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderColor: {
        default: null,
        parseHTML: element => {
          const borderLeftColor = element.style.borderLeftColor
          const dataAttr = element.getAttribute('data-border-color')
          return borderLeftColor || dataAttr
        },
        renderHTML: attributes => {
          if (!attributes.borderColor) return {}
          return {
            'data-border-color': attributes.borderColor,
            style: `border-left-color: ${attributes.borderColor}`,
          }
        },
      },
      backgroundColor: {
        default: null,
        parseHTML: element => {
          const bgColor = element.style.backgroundColor
          const dataAttr = element.getAttribute('data-background-color')
          return bgColor || dataAttr
        },
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {}
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
    }
  },
})

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {}
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
    }
  },
})

export default function Editor({ value, onChange, onError }) {
  const [selectedColor, setSelectedColor] = useState('#c53030')
  const [selectedTableColor, setSelectedTableColor] = useState('#c53030')
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [quoteColorPickerOpen, setQuoteColorPickerOpen] = useState(false)
  const [tableColorPickerOpen, setTableColorPickerOpen] = useState(false)
  const fileInputRef = useRef(null)
  const colorOptions = ['#c53030', '#db7093', '#7c3aed', '#2563eb', '#16a34a', '#d97706', '#000000']
  const [initialContent] = useState(() => (typeof value === 'string' && value.trim() ? value : '<p></p>'))
  const lastSyncedHtmlRef = useRef(initialContent)
  const editorProps = useMemo(() => ({
    attributes: {
      class: 'editor-prose',
    },
  }), [])
  const editorExtensions = useMemo(() => [
    StarterKit.configure({
      codeBlock: false,
      blockquote: false,
      link: false,
    }),
    MonacoCodeBlockExtension,
    ColoredBlockquote,
    MathExtension,
    TextStyle.configure({
      types: ['textStyle'],
    }),
    FontSize,
    Color.configure({
      types: ['textStyle'],
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right'],
      defaultAlignment: 'left',
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
      defaultProtocol: 'https',
    }),
    ResizableImage.configure({
      allowBase64: true,
    }),
    ImageCarousel,
    ColoredTable.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell.configure({
      allowColspan: true,
      allowRowspan: true,
    }),
  ], [])

  const editor = useEditor({
    extensions: editorExtensions,
    immediatelyRender: false,
    editorProps,
    content: initialContent,
    onContentError: ({ error }) => {
      onError?.(error?.message || 'The saved draft content could not be opened in the editor.')
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!currentEditor?.isDestroyed && currentEditor.schema) {
        try {
          const nextHtml = currentEditor.getHTML()
          lastSyncedHtmlRef.current = nextHtml
          onChange?.(nextHtml)
        } catch {
          // Ignore transient reads while React remounts the editor in development Strict Mode.
        }
      }
    },
  })

  useEffect(() => {
    if (
      !editor ||
      editor.isDestroyed ||
      !editor.schema ||
      typeof value !== 'string' ||
      value === lastSyncedHtmlRef.current
    ) {
      return
    }

    const nextContent = value || '<p></p>'
    const timeoutId = window.setTimeout(() => {
      if (!editor || editor.isDestroyed || !editor.schema) {
        return
      }

      try {
        editor.commands.setContent(nextContent, false)
        lastSyncedHtmlRef.current = nextContent
      } catch (contentError) {
        onError?.(contentError?.message || 'The saved draft content could not be opened in the editor.')
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [editor, onError, value])

  if (!editor) {
    return null
  }

  function handleLinkClick() {
    const currentUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Enter a URL', currentUrl)

    if (url === null) {
      return
    }

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function handleImageClick() {
    fileInputRef.current?.click()
  }

  function getCurrentBlockAlignment() {
    const paragraphAlignment = editor.getAttributes('paragraph').textAlign
    const headingAlignment = editor.getAttributes('heading').textAlign

    return normalizeImageAlignment(paragraphAlignment || headingAlignment || 'left')
  }

  function getCurrentImageAlignment() {
    return normalizeImageAlignment(editor.getAttributes('image').floatPosition)
  }

  function isAlignmentActive(alignment) {
    if (editor.isActive('image')) {
      return getCurrentImageAlignment() === alignment
    }

    return editor.isActive({ textAlign: alignment }) || (
      alignment === 'left' &&
      !editor.isActive({ textAlign: 'center' }) &&
      !editor.isActive({ textAlign: 'right' })
    )
  }

  function handleSetAlignment(alignment) {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', {
        floatPosition: alignment,
      }).run()
      return
    }

    editor.chain().focus().setTextAlign(alignment).run()
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file, 'Article image')
    if (validationError) {
      onError?.(validationError)
      event.target.value = ''
      return
    }

    try {
      const image = await uploadImageFile(file, 'article')
      editor.chain().focus().setImage({
        src: image.url || image.path,
        floatPosition: getCurrentBlockAlignment(),
      }).run()
      onError?.('')
    } catch (uploadError) {
      onError?.(getUserFriendlyError(uploadError))
    } finally {
      event.target.value = ''
    }
  }

  function handleColorClick() {
    setColorPickerOpen((current) => !current)
  }

  function handleSetColor(color) {
    setSelectedColor(color)
    editor.chain().focus().setColor(color).run()
  }

  function handleQuoteColorClick() {
    // Ensure we're in a blockquote before opening the color picker
    if (!editor.isActive('blockquote')) {
      editor.chain().focus().toggleBlockquote().run()
    }
    setQuoteColorPickerOpen((current) => !current)
  }

  function lightenColor(color, percent) {
    // Remove # if present
    color = color.replace(/^#/, '')

    // Parse r, g, b values
    const num = parseInt(color, 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt

    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }

  function handleSetQuoteColor(color) {
    const lightColor = lightenColor(color, 65) // Lighten by 65%
    // Only update color attributes - blockquote should already exist
    editor.chain().focus().updateAttributes('blockquote', { 
      borderColor: color, 
      backgroundColor: lightColor 
    }).run()
  }

  function handleTableColorClick() {
    setTableColorPickerOpen((current) => !current)
  }

  function handleSetTableColor(color) {
    setSelectedTableColor(color)
    editor.chain().focus().updateAttributes('table', {
      tableHeaderColor: color,
    }).run()
  }

  function handleAddTable() {
    editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
  }

  function getCurrentTableCellAttrs() {
    return editor ? editor.getAttributes('tableCell') : {}
  }

  function changeTableCellSpan(attribute, delta) {
    const attrs = getCurrentTableCellAttrs()
    const current = Number(attrs[attribute] || 1)
    const nextValue = Math.max(1, current + delta)

    editor.chain().focus().updateAttributes('tableCell', { [attribute]: nextValue }).run()
  }

  function handleAddTableRow(position) {
    editor.chain().focus()[position]().run()
  }

  function handleAddTableColumn(position) {
    editor.chain().focus()[position]().run()
  }

  function handleDeleteTablePart(command) {
    editor.chain().focus()[command]().run()
  }

  function handleMergeCells() {
    editor.chain().focus().mergeCells().run()
  }

  function handleSplitCell() {
    editor.chain().focus().splitCell().run()
  }

  const isTableActive = editor.isActive('table')
  const isTableCellActive = editor.isActive('tableCell')
  const tableCellAttrs = getCurrentTableCellAttrs()
  const colspan = Number(tableCellAttrs.colspan || 1)
  const rowspan = Number(tableCellAttrs.rowspan || 1)

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <label htmlFor="font-size-input" className="toolbar-label">Font Size:</label>
          <button
            type="button"
            className="toolbar-button toolbar-icon-button"
            onClick={() => {
              const currentSize = parseInt(editor.getAttributes('textStyle').fontSize || '16', 10)
              const newSize = Math.max(8, currentSize - 2)
              editor.chain().focus().setFontSize(`${newSize}px`).run()
            }}
            title="Decrease font size"
          >
            <FaMinus />
          </button>
          <input
            type="number"
            id="font-size-input"
            min="8"
            max="72"
            className="toolbar-font-size-input"
            value={parseInt(editor.getAttributes('textStyle').fontSize || '16', 10)}
            onChange={(e) => {
              const size = Math.max(8, Math.min(72, parseInt(e.target.value, 10) || 16))
              editor.chain().focus().setFontSize(`${size}px`).run()
            }}
            title="Set font size"
          />
          <button
            type="button"
            className="toolbar-button toolbar-icon-button"
            onClick={() => {
              const currentSize = parseInt(editor.getAttributes('textStyle').fontSize || '16', 10)
              const newSize = Math.min(72, currentSize + 2)
              editor.chain().focus().setFontSize(`${newSize}px`).run()
            }}
            title="Increase font size"
          >
            <FaPlus />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <ToolbarButton
            active={isAlignmentActive('left')}
            icon={<FaAlignLeft />}
            onClick={() => handleSetAlignment('left')}
          />
          <ToolbarButton
            active={isAlignmentActive('center')}
            icon={<FaAlignCenter />}
            onClick={() => handleSetAlignment('center')}
          />
          <ToolbarButton
            active={isAlignmentActive('right')}
            icon={<FaAlignRight />}
            onClick={() => handleSetAlignment('right')}
          />
        </div>

        <div className="toolbar-divider" />

        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          icon={<><FaHeading />2</>}
          label=""
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          icon={<><FaHeading />3</>}
          label=""
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          active={editor.isActive('bold')}
          icon={<FaBold />}
          label=""
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          icon={<FaItalic />}
          label=""
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          icon={<FaQuoteLeft />}
          label=""
          onClick={handleQuoteColorClick}
        />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          icon={<FaListUl />}
          label=""
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          icon={<FaListOl />}
          label=""
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          icon={<FaCode />}
          label=""
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          active={editor.isActive('link')}
          icon={<FaLink />}
          onClick={handleLinkClick}
        />
        <ToolbarButton
          icon={<FaPalette />}
          label=""
          colorIndicator={selectedColor}
          onClick={handleColorClick}
        />
        <ToolbarButton
          icon={<FaImage />}
          label="Image"
          onClick={handleImageClick}
        />
        <ToolbarButton
          active={editor.isActive('imageCarousel')}
          icon={<FaImage />}
          label="Carousel"
          onClick={() => editor.chain().focus().insertImageCarousel().run()}
        />
        <ToolbarButton
          active={editor.isActive('math')}
          icon={<FaSquareRootAlt />}
          label=""
          onClick={() => editor.chain().focus().insertContent({ type: 'math' }).run()}
        />
        <ToolbarButton
          icon={<FaTable />}
          label="Table"
          onClick={handleAddTable}
        />

        {isTableActive ? (
          <div className="table-toolbar">
            <ToolbarButton
              label="Delete Table"
              onClick={() => editor.chain().focus().deleteTable().run()}
            />
            <ToolbarButton
              label="Add Row"
              onClick={() => handleAddTableRow('addRowAfter')}
            />
            <ToolbarButton
              label="Add Column"
              onClick={() => handleAddTableColumn('addColumnAfter')}
            />
            <ToolbarButton
              label="Delete Row"
              onClick={() => handleDeleteTablePart('deleteRow')}
            />
            <ToolbarButton
              label="Delete Column"
              onClick={() => handleDeleteTablePart('deleteColumn')}
            />
            <ToolbarButton
              label="Merge Cells"
              onClick={handleMergeCells}
            />
            <ToolbarButton
              label="Split Cell"
              onClick={handleSplitCell}
            />
            <ToolbarButton
              label=""
              colorIndicator={selectedTableColor}
              onClick={handleTableColorClick}
            />
            {isTableCellActive ? (
              <>
                <ToolbarButton
                  icon={<FaPlus />}
                  label={`Colspan ${colspan}`}
                  onClick={() => changeTableCellSpan('colspan', 1)}
                />
                <ToolbarButton
                  icon={<FaPlus />}
                  label={`Rowspan ${rowspan}`}
                  onClick={() => changeTableCellSpan('rowspan', 1)}
                />
                <ToolbarButton
                  icon={<FaMinus />}
                  label="Col -"
                  onClick={() => changeTableCellSpan('colspan', -1)}
                />
                <ToolbarButton
                  icon={<FaMinus />}
                  label="Row -"
                  onClick={() => changeTableCellSpan('rowspan', -1)}
                />
              </>
            ) : null}
          </div>
        ) : null}

        <ToolbarButton
          icon={<FaMinus />}
          label="H-Rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        {colorPickerOpen ? (
          <div className="color-popover">
            <div className="color-picker-preview">
              <span
                className="color-picker-preview__swatch"
                style={{ background: selectedColor }}
              />
              <span>
                Selected {selectedColor}
              </span>
            </div>
            <div className="color-grid">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="color-swatch"
                  type="button"
                  style={{ background: color }}
                  onClick={() => handleSetColor(color)}
                />
              ))}
            </div>
            <div className="color-picker-inline">
              <input
                type="color"
                value={selectedColor}
                onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
                onChange={(event) => handleSetColor(event.target.value)}
              />
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={() => setColorPickerOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        {quoteColorPickerOpen ? (
          <div className="color-popover">
            <div className="color-picker-section">
              <label>Quote Color</label>
              <div className="color-grid">
                {colorOptions.map((color) => (
                  <button
                    key={`quote-${color}`}
                    className="color-swatch"
                    type="button"
                    style={{ background: color }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSetQuoteColor(color)
                    }}
                  />
                ))}
              </div>
              <input
                type="color"
                onChange={(event) => {
                  handleSetQuoteColor(event.target.value)
                }}
              />
            </div>
            <div className="color-picker-actions">
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  editor.chain().focus().toggleBlockquote().run()
                  setQuoteColorPickerOpen(false)
                }}
              >
                {editor.isActive('blockquote') ? 'Remove Quote' : 'Insert Quote'}
              </button>
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setQuoteColorPickerOpen(false)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {tableColorPickerOpen ? (
          <div className="color-popover">
            <div className="color-picker-section">
              <div className="color-grid">
                {colorOptions.map((color) => (
                  <button
                    key={`table-${color}`}
                    className="color-swatch"
                    type="button"
                    style={{ background: color }}
                    onClick={() => handleSetTableColor(color)}
                  />
                ))}
              </div>
              <input
                type="color"
                onChange={(event) => handleSetTableColor(event.target.value)}
              />
            </div>
            <div className="color-picker-actions">
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={() => setTableColorPickerOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ARTICLE_IMAGE_LIMITS.allowedTypes.join(',')}
        hidden
        onChange={handleImageUpload}
      />

      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
      <p className="field-note">
        Images: JPEG, PNG, or WebP up to {formatFileSize(ARTICLE_IMAGE_LIMITS.maxBytes)} each.
      </p>
    </div>
  )
}

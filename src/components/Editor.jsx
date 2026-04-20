import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  useEditor,
} from '@tiptap/react'
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
import Blockquote from '@tiptap/extension-blockquote'
import MonacoEditor from '@monaco-editor/react'
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
} from 'react-icons/fa'

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

function ResizableImageComponent({ node, updateAttributes, selected, deleteNode }) {
  const [size, setSize] = useState({
    width: node.attrs.width || 520,
    height: node.attrs.height || null,
  })
  const [position, setPosition] = useState({
    floatPosition: node.attrs.floatPosition || 'center', // 'left', 'right', 'center'
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

  function handleFloatChange(newPosition) {
    setPosition({ floatPosition: newPosition })
    updateAttributes({ floatPosition: newPosition })
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
      floatPosition: node.attrs.floatPosition || 'center',
    })
  }, [node.attrs.floatPosition])

  return (
    <NodeViewWrapper className={`image-node${selected ? ' is-selected' : ''}`}>
      <div
        className="image-frame"
        ref={containerRef}
        style={{
          width: size.width ? `${size.width}px` : 'auto',
          height: size.height ? `${size.height}px` : 'auto',
          maxWidth: '100%',
          float: position.floatPosition === 'left' ? 'left' : position.floatPosition === 'right' ? 'right' : 'none',
          margin: position.floatPosition !== 'center' ? '0 1rem 1rem 0' : '0',
          clear: 'none',
        }}
      >
        {node.attrs.src && (
          <img src={node.attrs.src} alt={node.attrs.alt || 'Image'} />
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
        default: 'center',
        parseHTML: element => element.getAttribute('data-float') || 'center',
        renderHTML: attributes => {
          const floatValue = attributes.floatPosition || 'center'
          return {
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

function MonacoCodeBlock({ node, updateAttributes, editor, getPos }) {
  const value = node.textContent || ''
  const language = node.attrs?.language || 'python'
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
      <div className="monaco-code-block">
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
        <MonacoEditor
          height={height}
          language={language}
          value={value}
          onChange={handleChange}
          theme="vs-dark"
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
          return {
            'data-language': attributes.language,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(MonacoCodeBlock)
  },
})

function ResizableTable({ node, updateAttributes, selected }) {
  const [size, setSize] = useState({
    width: node.attrs?.width || null,
    height: node.attrs?.height || null,
  })
  const containerRef = useRef(null)
  const dragState = useRef({ axis: null, startX: 0, startY: 0, width: 0, height: 0 })

  useEffect(() => {
    function handleMouseMove(event) {
      if (!dragState.current.axis) {
        return
      }

      const dx = event.clientX - dragState.current.startX
      const dy = event.clientY - dragState.current.startY
      let nextWidth = dragState.current.width
      let nextHeight = dragState.current.height

      if (dragState.current.axis === 'horizontal' || dragState.current.axis === 'both') {
        nextWidth = Math.max(200, dragState.current.width + dx)
      }

      if (dragState.current.axis === 'vertical' || dragState.current.axis === 'both') {
        nextHeight = Math.max(100, dragState.current.height + dy)
      }

      updateAttributes({ width: nextWidth, height: nextHeight })
      setSize({ width: nextWidth, height: nextHeight })
    }

    function handleMouseUp() {
      if (!dragState.current.axis) {
        return
      }

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
      axis,
      startX: event.clientX,
      startY: event.clientY,
      width: canvas?.offsetWidth || 400,
      height: canvas?.offsetHeight || 200,
    }
    document.body.style.userSelect = 'none'
  }

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
        renderHTML: attributes => ({
          'data-header-color': attributes.tableHeaderColor || '#c53030',
        }),
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
        default: '#ff2a2a',
        parseHTML: element => element.style.borderLeftColor || element.getAttribute('data-border-color') || '#ff2a2a',
        renderHTML: attributes => {
          const color = attributes.borderColor || '#ff2a2a'
          return {
            'data-border-color': color,
            style: `border-left: 4px solid ${color};`,
          }
        },
      },
      backgroundColor: {
        default: 'rgba(255, 241, 241, 0.8)',
        parseHTML: element => element.style.backgroundColor || element.getAttribute('data-background-color') || 'rgba(255, 241, 241, 0.8)',
        renderHTML: attributes => {
          const color = attributes.backgroundColor || 'rgba(255, 241, 241, 0.8)'
          return {
            'data-background-color': color,
            style: `background-color: ${color};`,
          }
        },
      },
    }
  },
})

export default function Editor({ value, onChange }) {
  const [selectedColor, setSelectedColor] = useState('#c53030')
  const [selectedTableColor, setSelectedTableColor] = useState('#c53030')
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [quoteColorPickerOpen, setQuoteColorPickerOpen] = useState(false)
  const [tableColorPickerOpen, setTableColorPickerOpen] = useState(false)
  const fileInputRef = useRef(null)
  const colorOptions = ['#c53030', '#db7093', '#7c3aed', '#2563eb', '#16a34a', '#d97706', '#000000']

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        blockquote: false,
      }),
      MonacoCodeBlockExtension,
      ColoredBlockquote,
      TextStyle.configure({
        types: ['textStyle'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        defaultProtocol: 'https',
      }),
      ResizableImage.configure({
        allowBase64: true,
      }),
      ColoredTable.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        allowColspan: true,
        allowRowspan: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'editor-prose',
      },
    },
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor || typeof value !== 'string' || value === editor.getHTML()) {
      return
    }

    editor.commands.setContent(value, false)
  }, [editor, value])

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

  function handleImageUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run()
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  function handleColorClick() {
    setColorPickerOpen((current) => !current)
  }

  function handleSetColor(color) {
    setSelectedColor(color)
    editor.chain().focus().setColor(color).run()
  }

  function handleQuoteColorClick() {
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
    editor.chain().focus().updateAttributes('blockquote', { 
      borderColor: color, 
      backgroundColor: lightColor 
    }).run()
  }

  const handleTableColorClick = useCallback(() => {
    setTableColorPickerOpen((current) => !current)
  }, [])

  const handleSetTableColor = useCallback((color) => {
    setSelectedTableColor(color)
    editor.chain().focus().updateAttributes('table', { 
      tableHeaderColor: color 
    }).run()
  }, [editor])

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
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          icon={<><FaHeading />2</>}
          label="H2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          icon={<><FaHeading />3</>}
          label="H3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          active={editor.isActive('bold')}
          icon={<FaBold />}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          icon={<FaItalic />}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          icon={<FaQuoteLeft />}
          label="Quote"
          onClick={handleQuoteColorClick}
        />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          icon={<FaListUl />}
          label="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          icon={<FaListOl />}
          label="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          icon={<FaCode />}
          label="Code Block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          active={editor.isActive('link')}
          icon={<FaLink />}
          label="Link"
          onClick={handleLinkClick}
        />
        <ToolbarButton
          icon={<FaPalette />}
          label="Color"
          colorIndicator={selectedColor}
          onClick={handleColorClick}
        />
        <ToolbarButton
          icon={<FaImage />}
          label="Upload Image"
          onClick={handleImageClick}
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
          label="Horizontal Rule"
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
                    onClick={() => handleSetQuoteColor(color)}
                  />
                ))}
              </div>
              <input
                type="color"
                onChange={(event) => handleSetQuoteColor(event.target.value)}
              />
            </div>
            <div className="color-picker-actions">
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={() => {
                  if (!editor.isActive('blockquote')) {
                    editor.chain().focus().toggleBlockquote().run()
                  }
                  setQuoteColorPickerOpen(false)
                }}
              >
                Insert Quote
              </button>
              <button
                className="button button--ghost button--small"
                type="button"
                onClick={() => setQuoteColorPickerOpen(false)}
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
        accept="image/*"
        hidden
        onChange={handleImageUpload}
      />

      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

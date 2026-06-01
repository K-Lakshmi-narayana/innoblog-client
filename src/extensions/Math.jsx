import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { FaTrash, FaEdit } from 'react-icons/fa'

function MathComponent({ node, updateAttributes, deleteNode, selected }) {
  const [isEditing, setIsEditing] = useState(false)
  const [latex, setLatex] = useState(node.attrs.latex || '')

  const handleSave = () => {
    if (latex.trim()) {
      updateAttributes({ latex })
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setLatex(node.attrs.latex)
    setIsEditing(false)
  }

  let renderedMath = null
  try {
    renderedMath = katex.renderToString(node.attrs.latex || '', {
      throwOnError: false,
      displayMode: true,
    })
  } catch {
    renderedMath = null
  }

  return (
    <NodeViewWrapper className="math-node-wrapper" data-drag-handle>
      <div className={`math-node ${selected ? 'selected' : ''}`}>
        {!isEditing ? (
          <>
            {renderedMath ? (
              <div
                className="math-render"
                dangerouslySetInnerHTML={{ __html: renderedMath }}
              />
            ) : (
              <div className="math-error">Invalid LaTeX: {node.attrs.latex}</div>
            )}
            {selected && (
              <div className="math-controls">
                <button
                  type="button"
                  className="math-control-btn"
                  onClick={() => setIsEditing(true)}
                  title="Edit formula"
                >
                  <FaEdit />
                </button>
                <button
                  type="button"
                  className="math-control-btn delete"
                  onClick={deleteNode}
                  title="Delete formula"
                >
                  <FaTrash />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="math-editor">
            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Enter LaTeX formula (e.g., E = mc^2)"
              className="math-textarea"
              autoFocus
            />
            {renderedMath && (
              <div className="math-preview">
                <div
                  dangerouslySetInnerHTML={{ __html: renderedMath }}
                />
              </div>
            )}
            <div className="math-actions">
              <button
                type="button"
                className="button button--small"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const Math = Node.create({
  name: 'math',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: 'E = mc^2',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math"]',
        getAttrs: (node) => {
          return {
            latex: node.getAttribute('data-latex') || 'E = mc^2',
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'math', 'data-latex': node.attrs.latex },
        {
          class: 'math-node',
        }
      ),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent)
  },
})

export default Math

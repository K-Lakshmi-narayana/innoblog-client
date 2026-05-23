import { useEffect, useId, useMemo, useRef, useState } from 'react'

import {
  MAX_ARTICLE_TAGS,
  MIN_ARTICLE_TAGS,
  normalizeTagKey,
} from '../data/tagSuggestions'
import '../styles/TagSelector.css'

export default function TagSelector({
  selectedTags = [],
  onTagsChange,
  domain,
  domainLabel,
  suggestedTags = [],
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [filterText, setFilterText] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const inputId = useId()
  const infoId = `${inputId}-info`
  const selectedTagKeys = useMemo(
    () => new Set(selectedTags.map((tag) => normalizeTagKey(tag))),
    [selectedTags],
  )
  const options = useMemo(
    () =>
      suggestedTags
        .filter(Boolean)
        .filter((tag, index, list) => {
          const key = normalizeTagKey(tag)
          return key && list.findIndex((entry) => normalizeTagKey(entry) === key) === index
        }),
    [suggestedTags],
  )
  const filteredTags = options.filter((tag) => {
    const tagMatch = normalizeTagKey(tag).includes(normalizeTagKey(filterText))
    return tagMatch && !selectedTagKeys.has(normalizeTagKey(tag))
  })
  const isAtLimit = selectedTags.length >= MAX_ARTICLE_TAGS
  const isValid =
    selectedTags.length >= MIN_ARTICLE_TAGS && selectedTags.length <= MAX_ARTICLE_TAGS
  const readableDomain = domainLabel || String(domain || '').toUpperCase()

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleTagAdd(tag) {
    if (isAtLimit) {
      setError(`Maximum ${MAX_ARTICLE_TAGS} tags allowed.`)
      return
    }

    const newTags = [...selectedTags, tag]
    onTagsChange(newTags)
    setError('')
    setFilterText('')
    inputRef.current?.focus()

    if (newTags.length >= MAX_ARTICLE_TAGS) {
      setIsOpen(false)
    }
  }

  function handleTagRemove(tag) {
    const newTags = selectedTags.filter((selectedTag) => selectedTag !== tag)
    onTagsChange(newTags)

    if (newTags.length < MIN_ARTICLE_TAGS) {
      setError(`Select at least ${MIN_ARTICLE_TAGS} tags.`)
    } else {
      setError('')
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (filteredTags[0] && !isAtLimit) {
        handleTagAdd(filteredTags[0])
      }
      return
    }

    if (event.key === 'Backspace' && !filterText && selectedTags.length) {
      handleTagRemove(selectedTags[selectedTags.length - 1])
    }
  }

  return (
    <div className="tag-selector" ref={containerRef}>
      <div className="tag-selector__header">
        <label className="tag-selector__label" htmlFor={inputId}>
          Tags ({selectedTags.length}/{MAX_ARTICLE_TAGS})
          {!isValid ? <span className="tag-selector__required">*</span> : null}
        </label>
      </div>

      <div className="tag-selector__control" onClick={() => inputRef.current?.focus()}>
        {selectedTags.length === 0 ? (
          <span className="tag-selector__placeholder">
            Select at least {MIN_ARTICLE_TAGS} tags
          </span>
        ) : (
          selectedTags.map((tag) => (
            <span key={tag} className="tag-chip">
              <span className="tag-chip__text">{tag}</span>
              <button
                className="tag-chip__remove"
                onClick={() => handleTagRemove(tag)}
                type="button"
                aria-label={`Remove ${tag}`}
              >
                x
              </button>
            </span>
          ))
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="tag-selector__filter"
          placeholder={isAtLimit ? 'Tag limit reached' : 'Search tags'}
          value={filterText}
          onChange={(event) => {
            setFilterText(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => !isAtLimit && setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          disabled={isAtLimit}
          aria-describedby={infoId}
          aria-expanded={isOpen}
          aria-controls={`${inputId}-listbox`}
          autoComplete="off"
        />
        <button
          className="tag-selector__toggle"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (!isAtLimit) {
              setIsOpen((current) => !current)
              inputRef.current?.focus()
            }
          }}
          aria-label="Toggle tag suggestions"
        >
          v
        </button>
      </div>

      {isOpen ? (
        <div className="tag-selector__dropdown">
          <div className="tag-selector__dropdown-header">
            <span>{filterText ? 'Matching tags' : `Trending in ${readableDomain}`}</span>
          </div>
          {filteredTags.length ? (
            <ul className="tag-selector__list" id={`${inputId}-listbox`} role="listbox">
              {filteredTags.map((tag) => (
                <li key={tag} className="tag-selector__item" role="option" aria-selected="false">
                  <button
                    className="tag-selector__option"
                    onClick={() => handleTagAdd(tag)}
                    type="button"
                  >
                    <span className="tag-selector__checkbox">+</span>
                    <span className="tag-selector__option-text">{tag}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="tag-selector__empty">
              {filterText ? `No tags match "${filterText}"` : 'No tag options available'}
            </div>
          )}
        </div>
      ) : null}

      {error ? <div className="tag-selector__error">{error}</div> : null}

      <div id={infoId} className={`tag-selector__info ${!isValid ? 'is-invalid' : ''}`}>
        {selectedTags.length < MIN_ARTICLE_TAGS
          ? `Select ${MIN_ARTICLE_TAGS - selectedTags.length} more tags.`
          : `${MAX_ARTICLE_TAGS - selectedTags.length} tags remaining.`}
      </div>
    </div>
  )
}

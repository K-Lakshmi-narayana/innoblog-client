import { FaShareNodes } from 'react-icons/fa6'

export default function ShareButton({ title, url, label = '' }) {
  function shareArticle() {
    const text = `Check out this article: ${title}`
    const shareUrl = new URL(url, window.location.origin).href
    
    // Try native share API first
    if (navigator.share) {
      navigator.share({
        title: title,
        url: shareUrl,
        text: text,
      }).catch(() => {
        // User cancelled share
      })
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Article link copied to clipboard!')
      })
    }
  }

  return (
    <button
      className="article-afterword__button article-share-button"
      type="button"
      onClick={shareArticle}
      aria-label="Share article"
      title="Share article"
    >
      <FaShareNodes aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </button>
  )
}

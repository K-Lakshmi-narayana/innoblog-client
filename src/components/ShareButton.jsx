export default function ShareButton({ title, url }) {
  function shareArticle() {
    const text = `Check out this article: ${title}`
    
    // Try native share API first
    if (navigator.share) {
      navigator.share({
        title: title,
        url: url,
        text: text,
      }).catch(() => {
        // User cancelled share
      })
    } else {
      // Fallback: Copy to clipboard
      const shareUrl = `${window.location.origin}${url}`
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Article link copied to clipboard!')
      })
    }
  }

  return (
    <button
      className="button button--secondary"
      type="button"
      onClick={shareArticle}
    >
      Share article
    </button>
  )
}

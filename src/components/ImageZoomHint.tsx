import './ImageZoomHint.css'

export default function ImageZoomHint() {
  return <span className="image-zoom-indicator" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M7.5 10.5h6m-3-3v6" />
    </svg>
  </span>
}

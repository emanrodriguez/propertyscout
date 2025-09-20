import { useState, useEffect } from 'react'

const ImageCarousel = ({
  imageUrls = [],
  width = 'auto',
  height = 'auto',
  className = '',
  fallbackImage = null,
  useInlineStyles = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [loadedImages, setLoadedImages] = useState(new Set())
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // If no images provided, use fallback
  const images = imageUrls.length > 0 ? imageUrls : [fallbackImage].filter(Boolean)
  const hasMultipleImages = images.length > 1

  // Debug logging
  useEffect(() => {
    console.log('ImageCarousel received:', {
      imageUrls,
      imageUrlsLength: imageUrls?.length,
      images,
      imagesLength: images.length,
      hasMultipleImages
    })
  }, [imageUrls, images, hasMultipleImages])

  // Preload current and next image
  useEffect(() => {
    if (images[currentIndex] && !loadedImages.has(currentIndex)) {
      const img = new Image()
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, currentIndex]))
      }
      img.src = images[currentIndex]
    }

    // Preload next image
    const nextIndex = (currentIndex + 1) % images.length
    if (images[nextIndex] && !loadedImages.has(nextIndex)) {
      const img = new Image()
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, nextIndex]))
      }
      img.src = images[nextIndex]
    }
  }, [currentIndex, images, loadedImages])

  const goToNext = () => {
    if (hasMultipleImages && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => (prev + 1) % images.length)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const goToPrev = () => {
    if (hasMultipleImages && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  const goToIndex = (index) => {
    if (hasMultipleImages && !isTransitioning && index !== currentIndex) {
      setIsTransitioning(true)
      setCurrentIndex(index)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  // Handle touch events for swipe with fluid drag
  const handleTouchStart = (e) => {
    if (!hasMultipleImages || isTransitioning) return

    setTouchStart(e.targetTouches[0].clientX)
    setTouchEnd(null)
    setIsDragging(true)
    setDragOffset(0)
  }

  const handleTouchMove = (e) => {
    if (!hasMultipleImages || !touchStart || isTransitioning) return

    const currentTouch = e.targetTouches[0].clientX
    const distance = touchStart - currentTouch
    const maxDrag = 100 // Maximum drag distance for visual feedback

    // Limit drag distance and add some resistance
    let limitedDistance = distance
    if (Math.abs(distance) > maxDrag) {
      limitedDistance = Math.sign(distance) * (maxDrag + (Math.abs(distance) - maxDrag) * 0.3)
    }

    setDragOffset(limitedDistance)
    setTouchEnd(currentTouch)

    // Only call preventDefault when allowed
    if (Math.abs(distance) > 5 && e.cancelable) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (!touchStart || touchEnd === null || !hasMultipleImages || isTransitioning) return

    const distance = touchStart - touchEnd
    const minSwipeDistance = 50
    const threshold = Math.min(100, window.innerWidth * 0.2) // 20% of screen width or 100px max

    setIsDragging(false)
    setDragOffset(0)

    if (Math.abs(distance) > minSwipeDistance && e.cancelable) {
      e.preventDefault()
    }

    if (Math.abs(distance) > threshold) {
      distance > 0 ? goToNext() : goToPrev()
    }

    // Reset touch values
    setTouchStart(null)
    setTouchEnd(null)
  }

  const handleImageError = (e) => {
    if (fallbackImage) {
      e.target.src = fallbackImage
    }
  }

  if (images.length === 0) {
    return <div className={`image-carousel-empty ${className}`} style={{ width, height }} />
  }

  return (
    <div
      className={`image-carousel ${className}`}
      style={{ width, height }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="carousel-container">
        <div
          className={`carousel-track ${isTransitioning ? 'transitioning' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            transform: `translateX(${-currentIndex * 100 + (isDragging ? -(dragOffset / 3) : 0)}%)`,
            transition: isDragging ? 'none' : isTransitioning ? 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'transform 0.2s ease-out'
          }}
        >
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Property ${index + 1}`}
              className="carousel-image"
              onError={handleImageError}
              draggable={false}
              style={{
                opacity: loadedImages.has(index) ? 1 : 0.7,
                transition: 'opacity 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {hasMultipleImages && (
        <>
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={goToPrev}
            aria-label="Previous image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>

          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={goToNext}
            aria-label="Next image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>

          {images.length > 1 && (
            <div className="carousel-indicators">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => goToIndex(index)}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImageCarousel
import { useMemo, useCallback, useState } from 'react'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import ImageModal from './ImageModal'

const ImageCarousel = ({
  imageUrls = [],
  width = 'auto',
  height = 'auto',
  className = '',
  fallbackImage = null,
  onImageClick = null,
  alt = null,
  enableEnlarge = true
}) => {
  const [loadedImages, setLoadedImages] = useState(new Set())
  const [errorImages, setErrorImages] = useState(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const images = useMemo(() => {
    const sanitizedImageUrls = (imageUrls || []).filter((u) => typeof u === 'string' && u.trim().length > 0)
    const finalImages = sanitizedImageUrls.length > 0 ? sanitizedImageUrls : [fallbackImage].filter(Boolean)
    console.log('ImageCarousel images:', { imageUrls, sanitizedImageUrls, finalImages })
    return finalImages
  }, [imageUrls, fallbackImage])

  const handleImageLoad = useCallback((index) => {
    setLoadedImages(prev => new Set([...prev, index]))
  }, [])

  const handleImageError = useCallback((index, e) => {
    if (fallbackImage && e?.target?.src !== fallbackImage) {
      e.target.src = fallbackImage
      return
    }
    setErrorImages(prev => new Set([...prev, index]))
  }, [fallbackImage])

  const handleImageClick = useCallback((index) => {
    if (onImageClick) {
      onImageClick(images[index])
    } else if (enableEnlarge && images.length > 0) {
      setCurrentSlide(index)
      setIsModalOpen(true)
    }
  }, [onImageClick, enableEnlarge, images])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const settings = useMemo(() => ({
    dots: false,
    infinite: images.length > 1,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: images.length > 1,
    lazyLoad: 'ondemand',
    adaptiveHeight: false,
    swipe: true,
    touchMove: true,
    draggable: true,
    afterChange: (index) => setCurrentSlide(index)
  }), [images.length])

  if (images.length === 0) {
    return <div className={`image-carousel-empty ${className}`} style={{ width, height }} />
  }

  return (
    <div
      className={`image-carousel ${className}`}
      style={{
        width,
        height,
        minHeight: height === 'auto' ? '200px' : height,
        backgroundColor: '#f5f5f5',
        position: 'relative'
      }}
    >
      <Slider {...settings}>
        {images.map((image, index) => (
          <div key={index} className="carousel-slide" style={{ position: 'relative' }}>
            {!loadedImages.has(index) && !errorImages.has(index) && (
              <div
                className="carousel-placeholder"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: height === 'auto' ? '200px' : height,
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  backgroundImage: `
                    linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent),
                    linear-gradient(#f0f0f0 50%, transparent 50%)
                  `,
                  backgroundSize: '200px 100%, 20px 20px',
                  animation: 'shimmer 1.5s infinite linear'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid #ddd',
                    borderTop: '3px solid #666',
                    animation: 'spin 1s linear infinite'
                  }}
                />
              </div>
            )}
            <img
              src={image}
              alt={alt || `Property ${index + 1}`}
              className="carousel-image"
              onError={(e) => handleImageError(index, e)}
              onLoad={() => handleImageLoad(index)}
              onClick={() => handleImageClick(index)}
              draggable={false}
              style={{
                filter: loadedImages.has(index) ? 'none' : 'blur(5px)',
                transition: 'filter 0.3s ease-out, opacity 0.3s ease-out',
                opacity: loadedImages.has(index) ? 1 : 0.7,
                cursor: (onImageClick || enableEnlarge) ? 'pointer' : 'default'
              }}
            />
          </div>
        ))}
      </Slider>

      <style>{`
        .image-carousel {
          width: 100%;
          height: ${height === 'auto' ? '200px' : height};
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }

        .image-carousel .slick-slider {
          height: 100%;
        }

        .image-carousel .slick-list {
          height: 100%;
        }

        .image-carousel .slick-track {
          height: 100%;
          display: flex;
          align-items: stretch;
        }

        .image-carousel .slick-slide {
          height: 100%;
        }

        .image-carousel .slick-slide > div {
          height: 100%;
        }

        .carousel-slide {
          height: 100%;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .carousel-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .carousel-placeholder {
          width: 100% !important;
          height: 100% !important;
        }

        @keyframes shimmer {
          0% { background-position: -200px 0, 0 0; }
          100% { background-position: 200px 0, 0 0; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Image Enlargement Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        imageUrls={images}
        initialIndex={currentSlide}
      />
    </div>
  )
}

export default ImageCarousel
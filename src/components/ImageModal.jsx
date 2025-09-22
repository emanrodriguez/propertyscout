import { useState, useEffect } from 'react'
import ImageCarousel from './ImageCarousel'

const ImageModal = ({ isOpen, onClose, imageUrls, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="image-modal-content">
          <ImageCarousel
            imageUrls={imageUrls}
            width="100%"
            height="80vh"
            className="modal-carousel"
          />
        </div>
      </div>

      <style>{`
        .image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .image-modal-container {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          width: 100%;
          background: transparent;
          border-radius: 8px;
          overflow: hidden;
        }

        .image-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 1001;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: background-color 0.2s;
        }

        .image-modal-close:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        .image-modal-close svg {
          width: 20px;
          height: 20px;
        }

        .image-modal-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-carousel {
          max-width: 100%;
          max-height: 100%;
        }

        .modal-carousel .slick-prev,
        .modal-carousel .slick-next {
          z-index: 1002;
          width: 50px;
          height: 50px;
        }

        .modal-carousel .slick-prev {
          left: 20px;
        }

        .modal-carousel .slick-next {
          right: 20px;
        }

        .modal-carousel .slick-prev:before,
        .modal-carousel .slick-next:before {
          font-size: 30px;
          color: white;
          opacity: 1;
        }

        .modal-carousel .carousel-image {
          max-height: 80vh;
          object-fit: contain !important;
        }

        @media (max-width: 768px) {
          .image-modal-overlay {
            padding: 10px;
          }

          .image-modal-close {
            top: 10px;
            right: 10px;
            width: 35px;
            height: 35px;
          }

          .modal-carousel .slick-prev,
          .modal-carousel .slick-next {
            width: 40px;
            height: 40px;
          }

          .modal-carousel .slick-prev {
            left: 10px;
          }

          .modal-carousel .slick-next {
            right: 10px;
          }
        }
      `}</style>
    </div>
  )
}

export default ImageModal
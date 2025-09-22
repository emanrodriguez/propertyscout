import ImageCarousel from './ImageCarousel'
import StatusDropdown from './StatusDropdown'
import { format_number } from '../lib/generic_functions'

const ListingsGrid = ({
  leads,
  onSMSClick,
  onDeleteLead,
  onArchiveLead,
  onStatusUpdate,
  onImageClick
}) => {
  const getPlaceholderImage = () => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0zMiAyNEwyNCAzMkgzMlYzNkg0OFYzMkg1NkwzMiAyNFoiIGZpbGw9IiM2QzdTN0QiLz4KPC9zdmc+Cg=='
  }

  const formatPrice = (price) => {
    if (!price) return 'Price not available'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatBedBath = (bedrooms, bathrooms) => {
    const beds = bedrooms || 0
    const baths = bathrooms || 0
    return `${beds} bds | ${baths} ba`
  }

  const formatSqft = (sqft) => {
    if (!sqft) return ''
    return `${sqft.toLocaleString()} sqft`
  }

  return (
    <div className="listings-grid">
      {leads.map((lead) => (
        <div key={lead.id} className="listing-card">
          {/* Property Image with Overlay Wrapper */}
          <div className="card-image-wrapper" style={{ position: 'relative'}}>
            <div className="card-image-container" style={{ position: 'relative' }}>
              <ImageCarousel
                imageUrls={
                  lead.listing?.image_urls ||
                  lead.property?.image_urls ||
                  [lead.property?.image_url].filter(Boolean) ||
                  []
                }
                width="100%"
                height="200px"
                fallbackImage={getPlaceholderImage()}
                alt={`Property at ${lead.property?.street_address}`}
                className="card-image"
                onImageClick={onImageClick}
              />
            </div>

            {/* Status Dropdown - Top Left */}
            <div className="card-status-overlay" style={{ position: 'absolute', top: 8, left: 8, zIndex: 100 }}>
              <StatusDropdown
                lead={lead}
                onStatusUpdate={onStatusUpdate}
              />
            </div>

            {/* Action Buttons - Top Right */}
            <div className="card-actions-overlay" style={{ position: 'absolute', top: 8, right: 8, zIndex: 100 }}>
              <button
                className="action-btn sms-btn"
                onClick={() => onSMSClick(lead)}
                title="Send SMS to agent"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button
                className="action-btn archive-btn"
                onClick={() => onArchiveLead(lead.id)}
                title="Archive lead"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path>
                  <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"></path>
                  <line x1="9" y1="12" x2="15" y2="12"></line>
                </svg>
              </button>
              <button
                className="action-btn delete-btn"
                onClick={() => onDeleteLead(lead.id)}
                title="Delete lead"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Property Info */}
          <div className="card-content">
            {/* Price */}
            <div className="card-price">
              {formatPrice(lead.listing?.price)}
            </div>

            {/* Property Details */}
            <div className="card-property-details">
              <span className="card-beds-baths">
                {formatBedBath(lead.property?.bedrooms, lead.property?.bathrooms)}
              </span>
              {lead.property?.year_built && (
                <>
                  <span className="card-separator">|</span>
                  <span className="card-sqft">{formatSqft(lead.listing.metadata?.livingAreaValue)}</span>
                </>
              )}
              {lead.property?.home_status && (
                <>
                  <span className="card-separator">|</span>
                  <span className="card-status">{lead.listing.metadata?.homeStatus}</span>
                </>
              )}
              {lead.property?.home_status && (
                <>
                  <span className="card-separator">|</span>
                  <span className="card-status">{lead.property.home_status}</span>
                </>
              )}
            </div>

            {/* Address */}
            <div className="card-address mt-auto" style={{marginBottom: '0px'}}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "baseline", // <-- align text bottoms, not boxes
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {lead.property?.street_address && (
                  <div className="card-street" style={{ color: "#555" }}>
                    {lead.property.street_address} {lead.property?.city}, {lead.property?.state} {lead.property?.zipcode}
                  </div>
                )}
              </div>
            </div>

            {/* Agent & Broker Info */}
            <div className="card-agent-info" style={{ paddingTop: '0px' }}>
              {lead.agent && (
                <div className="agent-details">
                  <div className="agent-name">{lead.agent.full_name}</div>
                  {lead.agent.phone_number && (
                    <div className="agent-contact">
                      <a href={`tel:${lead.agent.phone_number}`} className="phone-link">
                        {format_number(lead.agent.phone_number)}
                      </a>
                    </div>
                  )}
                  {lead.agent.email && (
                    <div className="agent-contact">
                      <a href={`mailto:${lead.agent.email}`} className="email-link">
                        {lead.agent.email}
                      </a>
                    </div>
                  )}
                  {lead.agent.license_number && (
                    <div className="agent-license">
                      DRE# {lead.agent.license_number}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ListingsGrid
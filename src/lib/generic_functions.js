/**
 * Detects the user's country code based on locale
 * @returns {string} Country code (e.g., 'US', 'CA', 'UK')
 */
export const detectUserCountryCode = () => {
  try {
    // Try to detect from browser locale
    const locale = navigator.language || navigator.userLanguage || 'en-US'

    // Extract country code from locale (e.g., 'en-US' -> 'US')
    const countryCode = locale.split('-')[1]?.toUpperCase()

    // Default to US if no country code detected
    return countryCode || 'US'
  } catch (error) {
    console.warn('Could not detect country code, defaulting to US:', error)
    return 'US'
  }
}

/**
 * Gets the country calling code based on country code
 * @param {string} countryCode - ISO country code (e.g., 'US', 'CA', 'UK')
 * @returns {string} Country calling code (e.g., '1', '44', '33')
 */
export const getCountryCallingCode = (countryCode) => {
  const callingCodes = {
    'US': '1',   // United States
    'CA': '1',   // Canada
    'GB': '44',  // United Kingdom
    'UK': '44',  // United Kingdom (alternative)
    'FR': '33',  // France
    'DE': '49',  // Germany
    'IT': '39',  // Italy
    'ES': '34',  // Spain
    'AU': '61',  // Australia
    'JP': '81',  // Japan
    'CN': '86',  // China
    'IN': '91',  // India
    'BR': '55',  // Brazil
    'MX': '52',  // Mexico
    'RU': '7',   // Russia
    'KR': '82',  // South Korea
    'NL': '31',  // Netherlands
    'SE': '46',  // Sweden
    'NO': '47',  // Norway
    'DK': '45',  // Denmark
    'FI': '358', // Finland
    'PL': '48',  // Poland
    'AT': '43',  // Austria
    'CH': '41',  // Switzerland
    'BE': '32',  // Belgium
    'IE': '353', // Ireland
    'PT': '351', // Portugal
    'GR': '30',  // Greece
    'TR': '90',  // Turkey
    'IL': '972', // Israel
    'SA': '966', // Saudi Arabia
    'AE': '971', // United Arab Emirates
    'ZA': '27',  // South Africa
    'EG': '20',  // Egypt
    'NG': '234', // Nigeria
    'KE': '254', // Kenya
    'GH': '233', // Ghana
    'AR': '54',  // Argentina
    'CL': '56',  // Chile
    'CO': '57',  // Colombia
    'PE': '51',  // Peru
    'VE': '58',  // Venezuela
    'TH': '66',  // Thailand
    'VN': '84',  // Vietnam
    'MY': '60',  // Malaysia
    'SG': '65',  // Singapore
    'ID': '62',  // Indonesia
    'PH': '63',  // Philippines
    'NZ': '64',  // New Zealand
  }

  return callingCodes[countryCode] || '1' // Default to US/Canada
}

/**
 * Formats a 10-digit phone number into international format
 * @param {string|number} phoneNumber - 10-digit phone number
 * @param {string} [countryCode] - Optional country code override
 * @returns {string} Formatted phone number in format +1(XXX)-XXX-XXXX
 */
export const format_number = (phoneNumber, countryCode = null) => {
  if (!phoneNumber) return ''

  // Convert to string and remove all non-digits
  const cleanNumber = phoneNumber.toString().replace(/\D/g, '')

  // Handle different number lengths
  let processedNumber = cleanNumber

  // If number starts with country code (e.g., 1234567890 for US), extract the local part
  if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
    processedNumber = cleanNumber.substring(1)
  } else if (cleanNumber.length === 10) {
    processedNumber = cleanNumber
  } else if (cleanNumber.length > 10) {
    // Take the last 10 digits
    processedNumber = cleanNumber.slice(-10)
  } else {
    // Number is too short, return as-is with plus sign
    return `+${cleanNumber}`
  }

  // Validate it's exactly 10 digits now
  if (processedNumber.length !== 10) {
    return `+${cleanNumber}`
  }

  // Detect country code if not provided
  const detectedCountryCode = countryCode || detectUserCountryCode()
  const callingCode = getCountryCallingCode(detectedCountryCode)

  // Format as +X(XXX)-XXX-XXXX
  const areaCode = processedNumber.substring(0, 3)
  const firstPart = processedNumber.substring(3, 6)
  const secondPart = processedNumber.substring(6, 10)

  return `+${callingCode}(${areaCode})-${firstPart}-${secondPart}`
}

/**
 * Creates a tel: URI for phone calls
 * @param {string} phoneNumber - Phone number in any format
 * @returns {string} tel: URI
 */
export const createPhoneCallLink = (phoneNumber) => {
  if (!phoneNumber) return ''

  // Extract only digits for the tel: link
  const digits = phoneNumber.toString().replace(/\D/g, '')
  return `tel:+${digits}`
}

/**
 * Creates an SMS URI for text messages
 * @param {string} phoneNumber - Phone number in any format
 * @param {string} [message] - Optional pre-filled message
 * @returns {string} sms: URI
 */
export const createSMSLink = (phoneNumber, message = '') => {
  if (!phoneNumber) return ''

  // Extract only digits for the sms: link
  const digits = phoneNumber.toString().replace(/\D/g, '')
  const smsUri = `sms:+${digits}`

  if (message) {
    return `${smsUri}?body=${encodeURIComponent(message)}`
  }

  return smsUri
}

/**
 * Validates if a phone number appears to be valid
 * @param {string|number} phoneNumber - Phone number to validate
 * @returns {boolean} True if number appears valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false

  const cleanNumber = phoneNumber.toString().replace(/\D/g, '')

  // Should be at least 10 digits, no more than 15 (international standard)
  return cleanNumber.length >= 10 && cleanNumber.length <= 15
}

/**
 * Formats a license number into DRE format
 * @param {string|number} licenseNumber - License number to format
 * @returns {string} Formatted license number as "DRE #<input>"
 */
export const format_dre = (licenseNumber) => {
  if (!licenseNumber) return ''

  // Convert to string and trim whitespace
  const cleanLicense = licenseNumber.toString().trim()

  if (!cleanLicense) return ''

  // Return formatted DRE number
  return `DRE #${cleanLicense}`
}
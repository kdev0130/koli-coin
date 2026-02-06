/**
 * Philippine Phone Number Validation and Normalization
 * 
 * Accepted formats:
 * - +63XXXXXXXXXX (international)
 * - 09XXXXXXXXX (local mobile)
 * - 9XXXXXXXXX (without leading 0)
 * 
 * All numbers are normalized to +63XXXXXXXXXX format
 */

const PH_COUNTRY_CODE = "+63";
const MOBILE_PREFIXES = [
  "813", "817", "895", "896", "897", "898", "899", // Globe
  "905", "906", "907", "908", "909", "910", "911", "912", "913", "914", 
  "915", "916", "917", "918", "919", "920", "921", "922", "923", "924",
  "925", "926", "927", "928", "929", "930", "931", "932", "933", "934",
  "935", "936", "937", "938", "939", "940", "941", "942", "943", "944",
  "945", "946", "947", "948", "949", "950", // Globe/TM
  "951", "953", "954", "955", "956", "957", "958", "959", "960", "961",
  "963", "964", "965", "966", "967", "968", "969", "970", "971", "972",
  "973", "974", "975", "976", "977", "978", "979", "980", "981", "982",
  "983", "984", "985", "989", "992", "993", "994", "995", "996", "997",
  "998", "999", // Smart/TNT/Sun
];

/**
 * Validate if a phone number is a valid Philippine mobile number
 */
export function isValidPhilippinePhone(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  // Remove all spaces, hyphens, parentheses
  const cleaned = phoneNumber.replace(/[\s\-()]/g, "");
  
  // Check format: +63XXXXXXXXXX
  if (cleaned.startsWith("+63")) {
    const digits = cleaned.substring(3);
    if (digits.length !== 10) return false;
    
    // Check if it starts with 9 (mobile)
    if (!digits.startsWith("9")) return false;
    
    // Check prefix
    const prefix = digits.substring(0, 3);
    return MOBILE_PREFIXES.includes(prefix);
  }
  
  // Check format: 09XXXXXXXXX
  if (cleaned.startsWith("09")) {
    if (cleaned.length !== 11) return false;
    
    const prefix = cleaned.substring(1, 4);
    return MOBILE_PREFIXES.includes(prefix);
  }
  
  // Check format: 9XXXXXXXXX (without leading 0)
  if (cleaned.startsWith("9") && !cleaned.startsWith("+")) {
    if (cleaned.length !== 10) return false;
    
    const prefix = cleaned.substring(0, 3);
    return MOBILE_PREFIXES.includes(prefix);
  }
  
  return false;
}

/**
 * Normalize Philippine phone number to +63XXXXXXXXXX format
 */
export function normalizePhilippinePhone(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  
  // Remove all spaces, hyphens, parentheses
  const cleaned = phoneNumber.replace(/[\s\-()]/g, "");
  
  // Already in +63XXXXXXXXXX format
  if (cleaned.startsWith("+63")) {
    const digits = cleaned.substring(3);
    if (digits.length === 10 && digits.startsWith("9")) {
      return cleaned;
    }
    return null;
  }
  
  // Convert 09XXXXXXXXX to +63XXXXXXXXXX
  if (cleaned.startsWith("09")) {
    if (cleaned.length === 11) {
      return `${PH_COUNTRY_CODE}${cleaned.substring(1)}`;
    }
    return null;
  }
  
  // Convert 9XXXXXXXXX to +63XXXXXXXXXX
  if (cleaned.startsWith("9") && !cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      return `${PH_COUNTRY_CODE}${cleaned}`;
    }
    return null;
  }
  
  return null;
}

/**
 * Format Philippine phone number for display
 * Returns in format: +63 9XX XXX XXXX
 */
export function formatPhilippinePhone(phoneNumber: string): string {
  const normalized = normalizePhilippinePhone(phoneNumber);
  if (!normalized) return phoneNumber;
  
  // +63XXXXXXXXXX -> +63 9XX XXX XXXX
  const digits = normalized.substring(3);
  return `+63 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
}

/**
 * Get error message for invalid phone number
 */
export function getPhoneValidationError(phoneNumber: string): string | null {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return "Phone number is required";
  }
  
  const cleaned = phoneNumber.replace(/[\s\-()]/g, "");
  
  if (cleaned.startsWith("+") && !cleaned.startsWith("+63")) {
    return "Only Philippine phone numbers are accepted";
  }
  
  if (cleaned.startsWith("+63")) {
    const digits = cleaned.substring(3);
    if (digits.length !== 10) {
      return "Phone number must have 10 digits after +63";
    }
    if (!digits.startsWith("9")) {
      return "Mobile number must start with 9";
    }
  } else if (cleaned.startsWith("09")) {
    if (cleaned.length !== 11) {
      return "Phone number must be 11 digits (09XXXXXXXXX)";
    }
  } else if (cleaned.startsWith("9")) {
    if (cleaned.length !== 10) {
      return "Phone number must be 10 digits (9XXXXXXXXX)";
    }
  } else {
    return "Invalid format. Use +63XXXXXXXXXX or 09XXXXXXXXX";
  }
  
  if (!isValidPhilippinePhone(phoneNumber)) {
    return "Invalid Philippine mobile number";
  }
  
  return null;
}

/**
 * Phone number disclaimer text
 */
export const PHONE_DISCLAIMER = "This phone number will be used for your e-wallet transactions.";

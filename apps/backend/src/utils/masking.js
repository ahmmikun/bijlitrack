/**
 * Masking utility for sensitive data
 */

/**
 * Masks a string by replacing middle characters with stars
 * @param {string} str 
 * @param {number} visiblePrefix 
 * @param {number} visibleSuffix 
 * @returns {string}
 */
export const maskString = (str, visiblePrefix = 2, visibleSuffix = 2) => {
  if (!str) return '';
  if (str.length <= visiblePrefix + visibleSuffix) return str;
  const prefix = str.slice(0, visiblePrefix);
  const suffix = str.slice(-visibleSuffix);
  const masked = '*'.repeat(str.length - visiblePrefix - visibleSuffix);
  return `${prefix}${masked}${suffix}`;
};

/**
 * Masks a CNIC (e.g., 12345-1234567-1 -> 12***-*******-1)
 * @param {string} cnic 
 * @returns {string}
 */
export const maskCNIC = (cnic) => {
  if (!cnic) return '';
  const parts = cnic.split('-');
  if (parts.length === 3) {
    return `${parts[0].slice(0, 2)}***-*******-${parts[2]}`;
  }
  return maskString(cnic, 2, 1);
};

/**
 * Masks an address
 * @param {string} address 
 * @returns {string}
 */
export const maskAddress = (address) => {
  if (!address) return '';
  const words = address.split(' ');
  if (words.length > 2) {
    return `${words[0]} **** ${words[words.length - 1]}`;
  }
  return maskString(address, 3, 3);
};

/**
 * Recursively masks sensitive fields in an object
 * @param {any} data 
 * @returns {any}
 */
export const maskSensitiveData = (data) => {
  if (!data) return data;

  // Handle Table Data structure { headers, rows }
  if (typeof data === 'object' && data.headers && Array.isArray(data.rows)) {
    const sensitiveIndices = data.headers.map((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('cnic')) return { index, type: 'cnic' };
      if (lowerHeader.includes('address')) return { index, type: 'address' };
      if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) return { index, type: 'phone' };
      if (lowerHeader.includes('name') && !lowerHeader.includes('feeder') && !lowerHeader.includes('station')) return { index, type: 'name' };
      return null;
    }).filter(item => item !== null);

    const maskedRows = data.rows.map(row => {
      const newRow = [...row];
      sensitiveIndices.forEach(({ index, type }) => {
        if (newRow[index]) {
          if (type === 'cnic') newRow[index] = maskCNIC(newRow[index]);
          else if (type === 'address') newRow[index] = maskAddress(newRow[index]);
          else if (type === 'phone') newRow[index] = maskString(newRow[index], 3, 2);
          else if (type === 'name') newRow[index] = maskString(newRow[index], 2, 1);
        }
      });
      return newRow;
    });

    return { ...data, rows: maskedRows };
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  if (typeof data === 'object') {
    const maskedObj = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('cnic') || lowerKey === 'nicno' || lowerKey.includes('_cnic')) {
        maskedObj[key] = maskCNIC(value);
      } else if (lowerKey.includes('address') || lowerKey.startsWith('addr') || lowerKey.includes('consumeraddress')) {
        maskedObj[key] = maskAddress(value);
      } else if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey === 'contactno' || lowerKey === 'consumercontactno') {
        maskedObj[key] = maskString(value, 3, 2);
      } else if (lowerKey.includes('name') && !lowerKey.includes('feeder') && !lowerKey.includes('station')) {
        // Only mask person names, not infrastructure names
        maskedObj[key] = maskString(value, 2, 1);
      } else if (typeof value === 'object') {
        maskedObj[key] = maskSensitiveData(value);
      } else {
        maskedObj[key] = value;
      }
    }
    return maskedObj;
  }
  return data;
};

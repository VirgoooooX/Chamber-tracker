export const sanitizeDataForFirestore = (data: Record<string, any>): Record<string, any> => {
  const sanitizedData: Record<string, any> = {}
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
      sanitizedData[key] = data[key]
    }
  }
  return sanitizedData
}


export const SUPPORTED_DOCUMENT_FORMATS = [
  'TXT',
  'MD',
  'MARKDOWN',
  'PDF',
  'HTML',
  'XLSX',
  'XLS',
  'DOC',
  'DOCX',
  'CSV',
  'PPTX',
  'PPT',
  'XML',
] as const

export const SUPPORTED_IMAGE_FORMATS = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'] as const

export const SUPPORTED_DOCUMENT_FORMAT_LABEL = SUPPORTED_DOCUMENT_FORMATS.join('、')
export const SUPPORTED_IMAGE_FORMAT_LABEL = SUPPORTED_IMAGE_FORMATS.join('、')

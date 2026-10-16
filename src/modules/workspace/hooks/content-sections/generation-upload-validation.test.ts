import { describe, expect, it } from '@jest/globals'

import { MAX_UPLOAD_FILE_SIZE_BYTES } from '@/constants/uploadLimits'

import {
  buildRejectedUploadFileMessage,
  buildUnsupportedUploadFileMessage,
  filterSupportedUploadFiles,
  isSupportedUploadFile,
} from './generation-upload-validation'

function file(name: string, type: string, size = 1024): File {
  return { name, type, size } as File
}

describe('isSupportedUploadFile', () => {
  it('accepts supported document extensions even when mime type is empty', () => {
    expect(isSupportedUploadFile(file('交底书.md', ''), 'file')).toBe(true)
    expect(isSupportedUploadFile(file('说明书.DOCX', ''), 'file')).toBe(true)
  })

  it('accepts supported document mime types even when extension is uncommon', () => {
    expect(isSupportedUploadFile(file('download', 'application/pdf'), 'file')).toBe(true)
  })

  it('rejects unsupported document files', () => {
    expect(isSupportedUploadFile(file('archive.zip', 'application/zip'), 'file')).toBe(false)
  })

  it('rejects supported document files when they exceed the generation upload size limit', () => {
    expect(
      isSupportedUploadFile(
        file('交底书.pdf', 'application/pdf', MAX_UPLOAD_FILE_SIZE_BYTES + 1),
        'file',
      ),
    ).toBe(false)
  })

  it('accepts only image mime types for image uploads', () => {
    expect(isSupportedUploadFile(file('示意图.png', 'image/png'), 'image')).toBe(true)
    expect(isSupportedUploadFile(file('假图片.png', 'application/octet-stream'), 'image')).toBe(
      false,
    )
  })
})

describe('filterSupportedUploadFiles', () => {
  it('keeps supported files and reports unsupported files in original order', () => {
    const supported = file('交底书.pdf', 'application/pdf')
    const unsupported = file('压缩包.zip', 'application/zip')
    const image = file('示意图.png', 'image/png')

    expect(filterSupportedUploadFiles([supported, unsupported, image], 'file')).toEqual({
      acceptedFiles: [supported],
      rejectedFiles: [unsupported, image],
    })
  })
})

describe('buildUnsupportedUploadFileMessage', () => {
  it('keeps the existing unsupported format message text', () => {
    expect(buildUnsupportedUploadFileMessage('压缩包.zip')).toBe(
      '文件 "压缩包.zip" 格式暂不受支持，目前支持 txt/md/pdf/html/xlsx/xls/docx/csv/eml/msg/pptx/ppt/xml/epub',
    )
  })
})

describe('buildRejectedUploadFileMessage', () => {
  it('explains oversized generation uploads separately from unsupported formats', () => {
    expect(
      buildRejectedUploadFileMessage(
        file('交底书.pdf', 'application/pdf', MAX_UPLOAD_FILE_SIZE_BYTES + 1),
      ),
    ).toBe('文件 "交底书.pdf" 大小超过限制，最大支持 10MB')
  })
})

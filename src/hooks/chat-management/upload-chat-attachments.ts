import { aiService } from '@/api/services'

import type { Attachment } from '../../types'

import type { ChatflowFile } from './types'

function resolveChatflowFileType(attachment: Attachment): ChatflowFile['type'] {
  const mimeType = attachment.file?.type.toLowerCase() ?? ''

  if (attachment.type === 'image' || mimeType.startsWith('image/')) {
    return 'image'
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio'
  }

  if (mimeType.startsWith('video/')) {
    return 'video'
  }

  return 'document'
}

export type UploadChatAttachmentsResult =
  | {
      status: 'success'
      files: ChatflowFile[]
    }
  | {
      status: 'failed'
      attachmentName: string
      error: unknown
    }
  | {
      status: 'aborted'
    }

export async function uploadChatAttachments(
  attachments: Attachment[],
  signal: AbortSignal,
): Promise<UploadChatAttachmentsResult> {
  const files: ChatflowFile[] = []

  for (const attachment of attachments) {
    if (!attachment.file) {
      continue
    }

    try {
      const fileUrl = await aiService.uploadFile(attachment.file, { signal })
      files.push({
        type: resolveChatflowFileType(attachment),
        transfer_method: 'remote_url',
        url: fileUrl,
      })
    } catch (error) {
      if (signal.aborted) {
        return { status: 'aborted' }
      }

      return {
        status: 'failed',
        attachmentName: attachment.name,
        error,
      }
    }
  }

  return {
    status: 'success',
    files,
  }
}

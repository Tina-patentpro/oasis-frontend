import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from '@jest/globals'

describe('settings production data boundaries', () => {
  test('does not ship fabricated referral or export data in production hooks', () => {
    const constantsSource = readFileSync(
      join(process.cwd(), 'src/components/settings/constants.ts'),
      'utf8',
    )
    const referralSource = readFileSync(
      join(
        process.cwd(),
        'src/components/settings/hooks/settings-panel/useProfileReferralState.ts',
      ),
      'utf8',
    )
    const settingsPanelSource = readFileSync(
      join(process.cwd(), 'src/components/SettingsPanel.tsx'),
      'utf8',
    )
    const settingsStateSource = readFileSync(
      join(process.cwd(), 'src/components/settings/hooks/useSettingsPanelState.ts'),
      'utf8',
    )

    expect(constantsSource).not.toContain('REFERRAL_SAMPLE')
    expect(referralSource).not.toContain('DEMO2024')
    expect(referralSource).not.toContain('Math.random')
    expect(settingsPanelSource).not.toContain('保存导出文件')
    expect(settingsStateSource).not.toContain('useExportDialogState')
  })
})

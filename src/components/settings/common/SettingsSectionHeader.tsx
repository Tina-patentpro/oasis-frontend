import React from 'react'

interface SettingsSectionHeaderProps {
  title: string
  description: string
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  title,
  description,
}) => (
  <div>
    <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
)

SettingsSectionHeader.displayName = 'SettingsSectionHeader'

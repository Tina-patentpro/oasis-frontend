interface RankedField {
  key: string
  required: boolean
}

export function rankSections(fields: RankedField[]): RankedField[] {
  return fields
    .map((field, index) => ({ ...field, index }))
    .sort((left, right) => {
      if (left.required !== right.required) {
        return Number(right.required) - Number(left.required)
      }
      return left.index - right.index
    })
    .map(({ index: _index, ...field }) => field)
}

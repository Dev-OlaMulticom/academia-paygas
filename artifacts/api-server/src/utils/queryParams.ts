export function getStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export function getNumberParam(value: string | string[] | undefined): number | undefined {
  const str = getStringParam(value)
  return str ? parseInt(str, 10) : undefined
}

export function getBooleanParam(value: string | string[] | undefined): boolean | undefined {
  const str = getStringParam(value)
  return str ? str === 'true' : undefined
}

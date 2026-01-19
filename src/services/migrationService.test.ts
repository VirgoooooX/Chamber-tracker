import { describe, expect, it } from 'vitest'
import { mapChamberToAsset } from './migrationService'

describe('migrationService', () => {
  it('maps chamber to asset with same id and type chamber', () => {
    const asset = mapChamberToAsset({
      id: 'c1',
      name: 'C-01',
      status: 'available',
      manufacturer: 'M',
      model: 'X',
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      calibrationDate: new Date('2026-01-02T00:00:00.000Z').toISOString(),
    })

    expect(asset.id).toBe('c1')
    expect(asset.type).toBe('chamber')
    expect(asset.name).toBe('C-01')
    expect(asset.manufacturer).toBe('M')
    expect(asset.model).toBe('X')
  })
})


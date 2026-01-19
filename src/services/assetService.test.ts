import { describe, expect, it, vi } from 'vitest'
import { getAssetsByType } from './assetService'

vi.mock('firebase/firestore', async () => {
  const actual: any = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(async () => ({
      docs: [
        {
          id: 'a1',
          data: () => ({
            type: 'chamber',
            name: 'C-01',
            status: 'available',
            assetCode: 'A-001',
            location: 'Lab-1',
            createdAt: { seconds: 0, nanoseconds: 0 },
            updatedAt: { seconds: 0, nanoseconds: 0 },
          }),
        },
      ],
    })),
  }
})

vi.mock('../firebase-config', () => ({ db: {} }))

describe('assetService', () => {
  it('parses assetCode and location', async () => {
    const assets = await getAssetsByType('chamber' as any)
    expect(assets[0].assetCode).toBe('A-001')
    expect(assets[0].location).toBe('Lab-1')
  })
})


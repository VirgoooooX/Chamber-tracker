import { describe, it, expect } from 'vitest'
import { sanitizeDataForFirestore } from './firestoreUtils'

describe('sanitizeDataForFirestore', () => {
  it('removes undefined fields and keeps other falsy values', () => {
    const input = {
      a: 1,
      b: undefined,
      c: null,
      d: '',
      e: 0,
      f: false,
    }
    expect(sanitizeDataForFirestore(input as any)).toEqual({
      a: 1,
      c: null,
      d: '',
      e: 0,
      f: false,
    })
  })
})


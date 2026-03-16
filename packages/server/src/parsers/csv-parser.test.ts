import { describe, it, expect } from 'vitest'

import { parseCsv } from './csv-parser.js'

describe('csv-parser', () => {
  it('parses simple CSV with headers', () => {
    const content = `name,role,module
analyst,Business Analyst,bmm
architect,System Architect,bmm`

    const result = parseCsv('test.csv', content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('analyst')
      expect(result.data[0].role).toBe('Business Analyst')
      expect(result.data[1].name).toBe('architect')
    }
  })

  it('handles quoted fields with commas', () => {
    const content = `name,capabilities
"analyst","market research, competitive analysis, requirements"
"architect","distributed systems, cloud, API design"`

    const result = parseCsv('test.csv', content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0].capabilities).toBe(
        'market research, competitive analysis, requirements',
      )
    }
  })

  it('handles empty file', () => {
    const result = parseCsv('empty.csv', '')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(0)
    }
  })

  it('handles escaped quotes', () => {
    const content = `name,desc
"test","a ""quoted"" value"`

    const result = parseCsv('test.csv', content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0].desc).toBe('a "quoted" value')
    }
  })
})

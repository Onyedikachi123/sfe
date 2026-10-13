import { getInitials } from './initials'

describe('getInitials', () => {
  it.each([
    ['Ada Okafor', 'AO'],
    ['Kwame Mensah', 'KM'],
    ['Okonkwo-Adeyemi Logistics & Haulage International Ltd', 'OA'],
    ['  zainab   bello ', 'ZB'],
    ['Madonna', 'M'],
    ['& 123 Ltd', 'L'],
    ['', ''],
  ])('%j -> %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })
})

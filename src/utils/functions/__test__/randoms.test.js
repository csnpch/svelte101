import '@testing-library/jest-dom'
import rand from './../randoms'


test('Test random number in between 1 - 10', () => {
    expect(rand.randomNumberBetween(1, 10)).toBeGreaterThan(0)  // > 0
    expect(rand.randomNumberBetween(1, 10)).toBeLessThan(11)    // < 11
})


test('Random string length 20 letter', () => {
    expect(rand.randomStringLength(20)).toHaveLength(20)
})

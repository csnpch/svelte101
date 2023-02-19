import '@testing-library/jest-dom'
import conv from './../converts'


test('Convert uppercase', () => {
    expect(conv.converToLowercase('SalMon')).toBe('salmon')
})


test('Covert to lowwercase', () => {
    expect(conv.convertToUppercase('BurGer')).toBe('BURGER')
})

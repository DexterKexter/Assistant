import assert from 'node:assert/strict'
import test from 'node:test'
import { CONTAINER_NUMBER_PATTERN, editContainerNumber } from '../src/lib/container-number.ts'

test('typing requires four Latin letters followed by seven digits', () => {
  let number = ''
  for (const character of 'bicu1234567') number = editContainerNumber(number + character, number)
  assert.equal(number, 'BICU1234567')
  for (const [value, previous] of [['1', ''], ['BI1', 'BI'], ['BICUX', 'BICU'], ['BICU12345678', number], ['Б', ''], ['ß', ''], ['BICU123A', 'BICU123']]) {
    assert.equal(editContainerNumber(value, previous), previous)
  }
})

test('formatted paste and replacing or deleting characters preserve the serial number', () => {
  assert.equal(editContainerNumber('bicu 123456-7', ''), 'BICU1234567')
  assert.equal(editContainerNumber('BICU0000010', 'BICU1234567'), 'BICU0000010')
  let number = 'BICU1234567'
  for (const value of ['BCU1234567', 'BU1234567', 'BCU1234567', 'BICU1234567', 'BICU123456', '']) {
    number = editContainerNumber(value, number)
    assert.equal(number, value)
  }
})

test('saving requires the complete format', () => {
  for (const value of ['', 'BIC', 'BICU', 'BICU123456', 'BICU12345678', 'BIC1234567', 'bicu1234567', 'БИКУ1234567', 'BICU12345X7']) {
    assert.equal(CONTAINER_NUMBER_PATTERN.test(value), false)
  }
  assert.equal(CONTAINER_NUMBER_PATTERN.test('BICU1234567'), true)
  assert.equal(CONTAINER_NUMBER_PATTERN.test('WWWW0000000'), true)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { cargoContactError, cargoItemError, cargoFileError } from '../src/lib/cargo-requests.ts'

test('draft may omit container and phone, completed form cannot', () => {
  const draft = {client_name:'Пример',phone:'',container_number:''}
  assert.equal(cargoContactError(draft),null)
  assert.ok(cargoContactError(draft,true))
  assert.ok(cargoContactError({...draft,client_name:' '}))
  assert.ok(cargoContactError({...draft,container_number:'1234ABCD'}))
  assert.equal(cargoContactError({...draft,phone:'+7 (700) 000-00-00',container_number:'BICU1234567'},true),null)
  assert.ok(cargoContactError({...draft,phone:'-------',container_number:'BICU1234567'},true))
})

test('items reject invalid quantities and package counts', () => {
  const item={name:'Стул',quantity:1,packages:null,weight_kg:null,volume_m3:null}
  assert.equal(cargoItemError(item),null)
  for(const quantity of [0,-1,NaN,Infinity]) assert.ok(cargoItemError({...item,quantity}))
  for(const packages of [-1,1.5]) assert.ok(cargoItemError({...item,packages}))
  assert.ok(cargoItemError({...item,weight_kg:-1}))
})

test('uploads enforce type and size, not just the file extension', () => {
  assert.equal(cargoFileError({type:'image/jpeg',size:1024},true),null)
  assert.ok(cargoFileError({type:'image/svg+xml',size:1024},true))
  assert.ok(cargoFileError({type:'image/png',size:11*1024*1024},true))
  assert.ok(cargoFileError({type:'image/png',size:0},true))
  assert.ok(cargoFileError({type:'application/pdf',size:1024},true))
  assert.equal(cargoFileError({type:'application/pdf',size:1024}),null)
})

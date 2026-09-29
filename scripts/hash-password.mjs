// Genera el hash de usuario + contraseña para src/lib/auth.ts
// Uso:  npm run hash-password -- USUARIO 'Contraseña'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const [usuario, pass] = process.argv.slice(2)
if (!usuario || !pass) {
  console.error("Uso: npm run hash-password -- USUARIO 'Contraseña'")
  process.exit(1)
}
const ITERACIONES = 310000
const sal = randomBytes(16).toString('hex')
const hash = pbkdf2Sync(`${usuario.trim().toUpperCase()}\n${pass}`, Buffer.from(sal, 'hex'), ITERACIONES, 32, 'sha256').toString('hex')
console.log('Pegá esto en src/lib/auth.ts:\n')
console.log(`export const CREDENCIAL = { sal: '${sal}', hash: '${hash}', iteraciones: ${ITERACIONES} }`)

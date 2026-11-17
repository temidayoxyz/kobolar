import { env } from '@/lib/env'

/** AES-GCM envelope for provider credentials stored in the business row.
 * Uses Web Crypto so it works on every deployment target. */
async function key(): Promise<CryptoKey> {
  const secret = env.APP_ENCRYPTION_KEY ?? 'dev-only-encryption-key-change-me-000000000000'
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(),
    new TextEncoder().encode(plaintext),
  )
  return toBase64(new Uint8Array([...iv, ...new Uint8Array(ciphertext)]))
}

export async function decryptSecret(payload: string): Promise<string> {
  const bytes = fromBase64(payload)
  const iv = bytes.slice(0, 12)
  const ciphertext = bytes.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await key(), ciphertext)
  return new TextDecoder().decode(decrypted)
}

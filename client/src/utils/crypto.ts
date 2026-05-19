import forge from 'node-forge';
export async function deriveFromMasterPassword(password: string, email: string) {
  const salt = email;
  const d = forge.pkcs5.pbkdf2(password, salt, 100000, 32, forge.md.sha256.create());
  const key = forge.util.bytesToHex(d);
  const md = forge.md.sha256.create();
  md.update(key);
  return { key, hashForServer: md.digest().toHex() };
}
export function generateKeyPair() {
  const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048);
  return { privateKeyPem: forge.pki.privateKeyToPem(privateKey), publicKeyPem: forge.pki.publicKeyToPem(publicKey) };
}
export function encryptSymmetric(data: string, keyHex: string) {
  const k = forge.util.hexToBytes(keyHex);
  const iv = forge.random.getBytesSync(12);
  const c = forge.cipher.createCipher('AES-GCM', k);
  c.start({ iv });
  c.update(forge.util.createBuffer(data, 'utf8'));
  c.finish();
  return forge.util.encode64(iv + c.mode.tag.getBytes() + c.output.getBytes());
}
export function decryptSymmetric(encoded: string, keyHex: string) {
  const k = forge.util.hexToBytes(keyHex);
  const d = forge.util.decode64(encoded);
  const iv = d.slice(0, 12);
  const tag = d.slice(12, 28);
  const enc = d.slice(28);
  const dec = forge.cipher.createDecipher('AES-GCM', k);
  dec.start({ iv, tag: forge.util.createBuffer(tag) });
  dec.update(forge.util.createBuffer(enc));
  if (!dec.finish()) throw new Error();
  return dec.output.toString();
}
export function encryptWithPublicKey(data: string, pem: string) {
  const pk = forge.pki.publicKeyFromPem(pem);
  return forge.util.encode64(pk.encrypt(data, 'RSA-OAEP'));
}
export function decryptWithPrivateKey(enc: string, pem: string) {
  const pk = forge.pki.privateKeyFromPem(pem);
  return pk.decrypt(forge.util.decode64(enc), 'RSA-OAEP');
}

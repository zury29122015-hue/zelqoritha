const { execFileSync } = require('node:child_process')
const path = require('node:path')

/**
 * No tenemos cuenta de Apple Developer (cuesta $99/año), así que la app no se puede
 * firmar "de verdad". Pero sin NINGUNA firma, macOS muestra "está dañado y no se puede
 * abrir" en vez del aviso normal de "desarrollador no identificado" (que sí se puede
 * saltar con clic derecho > Abrir). Una firma ad-hoc (sin certificado, gratis) evita
 * el mensaje de "dañado" y deja el aviso normal, que el usuario sí puede pasar.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath])
  console.log(`[afterPack] firma ad-hoc aplicada a ${appPath}`)
}

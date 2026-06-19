/**
 * Config plugin que genera res/xml/network_security_config.xml
 * y lo referencia en AndroidManifest.xml.
 *
 * Necesario para que HTTP cleartext (no HTTPS) funcione en Android 9+
 * en APKs de producción. El atributo android:usesCleartextTraffic del
 * manifest queda sobreescrito si existe un networkSecurityConfig, por
 * lo que hay que configurar ambos de forma explícita.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Permitir HTTP cleartext para la red interna (192.168.x.x) -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">192.168.4.202</domain>
    <domain includeSubdomains="false">192.168.4.1</domain>
    <domain includeSubdomains="false">192.168.1.1</domain>
  </domain-config>
  <!-- Permitir cleartext en cualquier IP de red privada como fallback -->
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

function withCrearXml(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_XML);
      console.log('[withNetworkSecurityConfig] network_security_config.xml generado en', xmlDir);
      return config;
    },
  ]);
}

function withReferenciarEnManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];

    // Referenciar el XML de seguridad de red
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    // También setear usesCleartextTraffic como medida adicional
    app.$['android:usesCleartextTraffic'] = 'true';

    console.log('[withNetworkSecurityConfig] AndroidManifest actualizado');
    return config;
  });
}

module.exports = function withNetworkSecurityConfig(config) {
  config = withCrearXml(config);
  config = withReferenciarEnManifest(config);
  return config;
};

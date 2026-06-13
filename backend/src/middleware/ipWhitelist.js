const { isIPv4 } = require('net');

// Verifica si una IP está dentro de un rango CIDR /24 simplificado
// Soporta IPs exactas (192.168.1.5) y rangos /24 (192.168.1.0/24)
function ipEnRango(ip, rango) {
  if (rango.includes('/')) {
    const [base, bits] = rango.split('/');
    const maskBits = parseInt(bits);

    // Solo soportamos /8, /16, /24 para simplificar
    const partes = base.split('.');
    const partesIp = ip.split('.');

    const segmentos = Math.floor(maskBits / 8);
    for (let i = 0; i < segmentos; i++) {
      if (partes[i] !== partesIp[i]) return false;
    }
    return true;
  }
  return ip === rango;
}

function soloRedInterna(req, res, next) {
  const allowedIPs = (process.env.ALLOWED_IPS || '127.0.0.1')
    .split(',')
    .map((ip) => ip.trim());

  // En Express, cuando hay proxy, usar x-forwarded-for
  const ipCliente =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '';

  // Normalizar IPv6 loopback
  const ipNormalizada = ipCliente === '::1' ? '127.0.0.1' : ipCliente.replace('::ffff:', '');

  const permitida = allowedIPs.some((rango) => ipEnRango(ipNormalizada, rango));

  if (!permitida) {
    console.warn(`[ACCESO DENEGADO] IP no permitida: ${ipNormalizada}`);
    return res.status(403).json({
      error: 'Acceso denegado: solo disponible desde la red interna',
    });
  }

  next();
}

module.exports = { soloRedInterna };

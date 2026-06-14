// Paleta de colores única de la aplicación Tabacalera.
// Todos los archivos deben importar desde aquí y nunca usar hex literals directamente.

const COLORES = {
  // ── Marca — Verdes ──────────────────────────────────────────────────────
  primario:             '#1B4332',  // Verde oscuro — cabeceras, botones, badges de código
  secundario:           '#2D6A4F',  // Verde medio — bordes de tarjeta, acentos secundarios
  acento:               '#52B788',  // Verde brillante — highlights, íconos de acento

  // Tonos para usar SOBRE el fondo primario (texto/íconos encima de verde oscuro)
  sobrePrimario:        '#A7F3D0',  // Verde claro — texto secundario sobre fondo primario
  sobrePrimarioSuave:   '#D1FAE5',  // Verde muy claro — texto fecha/GPS sobre cabecera
  sobrePrimarioOscuro:  '#065F46',  // Verde casi negro — texto sobre barra GPS clara

  // ── Fondos ──────────────────────────────────────────────────────────────
  fondo:                '#F5F5F0',  // Fondo general de todas las pantallas
  fondoOscuro:          '#1A1A1A',  // Fondo pantalla cámara/escáner
  fondoTarjeta:         '#FFFFFF',  // Fondo tarjetas, listas, barra buscador
  fondoInput:           '#FAFAFA',  // Fondo campo de texto (Login)
  fondoInputAlt:        '#F9FAFB',  // Fondo campo de texto (Inicio/buscador)
  fondoInfo:            '#F0F7F4',  // Fondo secciones informativas verdes suaves
  fondoAlerta:          '#EEF4FF',  // Fondo indicador de progreso/alerta azul
  fondoValido:          '#F0FDF4',  // Fondo fila fardo válido
  fondoInvalido:        '#FEF2F2',  // Fondo fila fardo inválido

  // ── Texto ───────────────────────────────────────────────────────────────
  texto:                '#1A1A1A',  // Texto principal (títulos, datos)
  textoClaro:           '#6B7280',  // Texto secundario — labels, placeholders, metadatos
  textoMuyClaro:        '#9CA3AF',  // Texto vacío / disabled / hint
  textoBlanco:          '#FFFFFF',  // Texto sobre fondos oscuros o de color

  // ── Estados / Feedback ──────────────────────────────────────────────────
  valido:               '#16A34A',  // Verde — fardo válido, envío cerrado
  invalido:             '#DC2626',  // Rojo vivo — fardo inválido
  duplicado:            '#D97706',  // Ámbar — fardo duplicado, envío abierto/advertencia
  peligro:              '#C0392B',  // Rojo oscuro — acciones destructivas, errores de login
  info:                 '#2563EB',  // Azul — botón PDF, acciones informacionales

  // ── Bordes y separadores ────────────────────────────────────────────────
  borde:                '#E5E7EB',  // Borde estándar — separadores de lista, tarjetas
  bordeInput:           '#D1D5DB',  // Borde campos de entrada de texto
  bordeValido:          '#A8D5B8',  // Borde secciones de resumen de envío válido

  // ── Sombras ─────────────────────────────────────────────────────────────
  sombra:               '#000000',  // Color base para shadowColor en tarjetas
};

export default COLORES;

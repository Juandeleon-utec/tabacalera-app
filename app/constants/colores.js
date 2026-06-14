// Paleta de colores única de la aplicación Tabacalera.
// Todos los archivos deben importar desde aquí y nunca usar hex literals directamente.
const COLORES = {
// ── Marca — Marrones / Dorados (Montepaz) ───────────────────────────────
primario:             '#6B5333',  // Marrón medio — cabeceras, botones, badges de código
secundario:           '#8A7B65',  // Marrón claro — bordes de tarjeta, acentos secundarios
acento:               '#B08D45',  // Dorado — highlights, íconos de acento
// Tonos para usar SOBRE el fondo primario (texto/íconos encima de marrón oscuro)
sobrePrimario:        '#F0E6D2',  // Beige claro — texto secundario sobre fondo primario
sobrePrimarioSuave:   '#E6D5B8',  // Beige muy claro — texto fecha/GPS sobre cabecera
sobrePrimarioOscuro:  '#3B2F1E',  // Marrón casi negro — texto sobre barra GPS clara
// ── Fondos ──────────────────────────────────────────────────────────────
fondo:                '#F7F4ED',  // Fondo general de todas las pantallas
fondoOscuro:          '#1A1A1A',  // Fondo pantalla cámara/escáner
fondoTarjeta:         '#FFFFFF',  // Fondo tarjetas, listas, barra buscador
fondoInput:           '#FAFAF6',  // Fondo campo de texto (Login)
fondoInputAlt:        '#FAFAF6',  // Fondo campo de texto (Inicio/buscador)
fondoInfo:            '#F1E9D8',  // Fondo secciones informativas marrón/dorado suaves
fondoAlerta:          '#EEF4FF',  // Fondo indicador de progreso/alerta azul
fondoValido:          '#F0FDF4',  // Fondo fila fardo válido
fondoInvalido:        '#FEF2F2',  // Fondo fila fardo inválido
// ── Texto ───────────────────────────────────────────────────────────────
texto:                '#2B2118',  // Texto principal (títulos, datos)
textoClaro:           '#8A7B65',  // Texto secundario — labels, placeholders, metadatos
textoMuyClaro:        '#9C8E76',  // Texto vacío / disabled / hint
textoBlanco:          '#FFFFFF',  // Texto sobre fondos oscuros o de color
// ── Estados / Feedback ──────────────────────────────────────────────────
valido:               '#16A34A',  // Verde — fardo válido, envío cerrado
invalido:             '#DC2626',  // Rojo vivo — fardo inválido
duplicado:            '#D97706',  // Ámbar — fardo duplicado, envío abierto/advertencia
peligro:              '#C0392B',  // Rojo oscuro — acciones destructivas, errores de login
info:                 '#2563EB',  // Azul — botón PDF, acciones informacionales
// ── Bordes y separadores ────────────────────────────────────────────────
borde:                '#E6DFD2',  // Borde estándar — separadores de lista, tarjetas
bordeInput:           '#D8CBB4',  // Borde campos de entrada de texto
bordeValido:          '#A8D5B8',  // Borde secciones de resumen de envío válido
// ── Sombras ─────────────────────────────────────────────────────────────
sombra:               '#000000',  // Color base para shadowColor en tarjetas
};
export default COLORES;
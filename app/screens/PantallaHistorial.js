import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import {
  listarEnviosResumenPorUsuarioYFecha,
  listarTodosEnviosResumenPorUsuario,
  listarFardosPorEnvio,
} from '../services/baseDeDatos';
import {
  generarPDFEnvio,
  compartirPDF,
  guardarPDFEnDispositivo,
  buscarPDFGuardado,
} from '../services/generadorPDF';
import COLORES from '../constants/colores';
import { formatearHoraLocal, duracionCarga } from '../utils/tiemposCarga';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function hoy() {
  const ahora = new Date();
  const a = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(a, m - 1, d + dias);
  const año = f.getFullYear();
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const dia = String(f.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

function formatearFechaLarga(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return `${DIAS_SEMANA[f.getDay()]} ${d} de ${MESES[m - 1]} de ${a}`;
}

function formatearHora(hora) {
  return hora ? hora.substring(0, 5) : '';
}

export default function PantallaHistorial({ navigation, route }) {
  const { sesion } = route.params;

  const [fecha, setFecha] = useState(hoy());
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [envios, setEnvios] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estado del modal de detalle
  const [modalVisible, setModalVisible] = useState(false);
  const [envioSeleccionado, setEnvioSeleccionado] = useState(null);
  const [fardosDetalle, setFardosDetalle] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [reenviandoPDF, setReenviandoPDF] = useState(false);

  const cargarEnvios = useCallback(async () => {
    setCargando(true);
    try {
      const lista = mostrarTodos
        ? await listarTodosEnviosResumenPorUsuario(sesion?.id ?? 0)
        : await listarEnviosResumenPorUsuarioYFecha(sesion?.id ?? 0, fecha);
      setEnvios(lista);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los envíos');
      console.error('[HISTORIAL]', e);
    } finally {
      setCargando(false);
    }
  }, [fecha, sesion, mostrarTodos]);

  useEffect(() => {
    cargarEnvios();
  }, [cargarEnvios]);

  async function abrirDetalle(envio) {
    setEnvioSeleccionado(envio);
    setFardosDetalle([]);
    setModalVisible(true);
    setCargandoDetalle(true);
    try {
      const fardos = await listarFardosPorEnvio(envio.id);
      setFardosDetalle(fardos);
    } catch {
      setFardosDetalle([]);
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarDetalle() {
    setModalVisible(false);
    setEnvioSeleccionado(null);
    setFardosDetalle([]);
  }

  async function manejarReenviarPDF() {
    if (!envioSeleccionado) return;
    setReenviandoPDF(true);
    try {
      // Busca si ya existe el PDF guardado
      let rutaPDF = await buscarPDFGuardado(envioSeleccionado);

      if (!rutaPDF) {
        // Reconstruir objeto transportista desde columnas desnormalizadas del JOIN
        const transportista = envioSeleccionado.transportista_empresa
          ? {
              empresa: envioSeleccionado.transportista_empresa,
              nombre_chofer: envioSeleccionado.transportista_chofer,
              matricula: envioSeleccionado.transportista_matricula,
            }
          : null;

        const datosEnvio = {
          ...envioSeleccionado,
          comprador_nombre: sesion?.nombre,
          transportista,
        };
        const uriTemporal = await generarPDFEnvio(datosEnvio, fardosDetalle);
        const { ruta } = await guardarPDFEnDispositivo(uriTemporal, envioSeleccionado);
        rutaPDF = ruta;
      }

      await compartirPDF(rutaPDF);
    } catch (e) {
      Alert.alert('Error al compartir PDF', e.message);
      console.error('[HISTORIAL PDF]', e);
    } finally {
      setReenviandoPDF(false);
    }
  }

  const esHoy = fecha === hoy();

  function renderEnvio({ item }) {
    const sincronizado = item.sincronizado === 1;
    const colorSync = sincronizado ? COLORES.valido : COLORES.duplicado;
    const transporte = item.transportista_empresa
      ? `${item.transportista_empresa}${item.transportista_chofer ? ' · ' + item.transportista_chofer : ''}`
      : null;
    return (
      <TouchableOpacity style={estilos.itemEnvio} onPress={() => abrirDetalle(item)}>
        <View style={estilos.itemFila}>
          <View style={estilos.codigoBadge}>
            <Text style={estilos.codigoTexto}>{item.agricultor_codigo}</Text>
          </View>
          <View style={estilos.itemDatos}>
            <Text style={estilos.nombreAgricultor} numberOfLines={1}>
              {item.agricultor_nombre}
            </Text>
            {transporte && (
              <Text style={estilos.itemTransporte} numberOfLines={1}>{transporte}</Text>
            )}
            <Text style={estilos.itemMeta}>
              {mostrarTodos && item.fecha ? `${item.fecha} · ` : ''}{formatearHora(item.hora)} · {item.total_validos ?? 0} válidos
            </Text>
          </View>
          <View style={estilos.syncCol}>
            <Text style={[estilos.syncIcono, { color: colorSync }]}>
              {sincronizado ? '✓' : '⏳'}
            </Text>
            <Text style={[estilos.syncLabel, { color: colorSync }]}>
              {sincronizado ? 'Sincronizado' : 'Pendiente'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Contadores del día ─────────────────────────────────────────────────────
  const totalDia = envios.length;
  const totalValidosDia = envios.reduce((s, e) => s + (e.total_validos ?? 0), 0);

  return (
    <View style={estilos.contenedor}>
      {/* Navegación de fecha */}
      <View style={estilos.navFecha}>
        {!mostrarTodos && (
          <TouchableOpacity style={estilos.botonDia} onPress={() => setFecha(f => sumarDias(f, -1))}>
            <Text style={estilos.botonDiaTexto}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={estilos.fechaContenedor}>
          {mostrarTodos ? (
            <Text style={estilos.fechaTexto}>Todos los envíos</Text>
          ) : (
            <>
              <Text style={estilos.fechaTexto} numberOfLines={1}>{formatearFechaLarga(fecha)}</Text>
              {esHoy && <Text style={estilos.hoyBadge}>HOY</Text>}
            </>
          )}
        </View>
        {!mostrarTodos && (
          <TouchableOpacity style={estilos.botonDia} onPress={() => setFecha(f => sumarDias(f, 1))}>
            <Text style={estilos.botonDiaTexto}>›</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[estilos.botonTodos, mostrarTodos && estilos.botonTodosActivo]}
          onPress={() => setMostrarTodos(t => !t)}
        >
          <Text style={estilos.botonTodosTexto}>{mostrarTodos ? 'Por fecha' : 'Todos'}</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      {!cargando && totalDia > 0 && (
        <View style={estilos.resumenDia}>
          <Text style={estilos.resumenTexto}>
            {totalDia} envío{totalDia !== 1 ? 's' : ''} · {totalValidosDia} fardos válidos en total
          </Text>
          {!esHoy && !mostrarTodos && (
            <TouchableOpacity onPress={() => setFecha(hoy())}>
              <Text style={estilos.botonHoyTexto}>Ir a hoy</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contenido principal */}
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORES.primario} />
      ) : envios.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}>
            {mostrarTodos
              ? 'No hay envíos registrados.'
              : `No hay envíos registrados\npara esta fecha.`}
          </Text>
          {!esHoy && !mostrarTodos && (
            <TouchableOpacity style={estilos.botonHoy} onPress={() => setFecha(hoy())}>
              <Text style={estilos.botonHoyTextoBtn}>Ir a hoy</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={envios}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEnvio}
          contentContainerStyle={estilos.lista}
          ItemSeparatorComponent={() => <View style={estilos.separador} />}
        />
      )}

      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarDetalle}
      >
        <View style={estilos.modalFondo}>
          <View style={estilos.modalCaja}>
            {/* Cabecera */}
            <View style={estilos.modalCabecera}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.modalTitulo} numberOfLines={1}>
                  {envioSeleccionado?.agricultor_nombre}
                </Text>
                <Text style={estilos.modalSubtitulo}>
                  {envioSeleccionado?.agricultor_codigo} · {formatearHora(envioSeleccionado?.hora)}
                  {' · '}
                  <Text style={{
                    color: envioSeleccionado?.sincronizado === 1 ? COLORES.valido : COLORES.duplicado,
                  }}>
                    {envioSeleccionado?.sincronizado === 1 ? '✓ Sincronizado' : '⏳ Pendiente'}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity onPress={cerrarDetalle} style={estilos.botonCerrar}>
                <Text style={estilos.botonCerrarTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Datos */}
            <View style={estilos.modalInfoBand}>
              {envioSeleccionado?.nro_remito ? (
                <Text style={estilos.modalInfoTexto}>
                  Remito N° {envioSeleccionado.nro_remito}
                </Text>
              ) : null}
              <Text style={estilos.modalInfoTexto}>
                Fecha: {envioSeleccionado?.fecha}
              </Text>
              {envioSeleccionado?.hora_inicio_carga ? (
                <Text style={estilos.modalInfoTexto}>
                  Carga: {formatearHoraLocal(envioSeleccionado.hora_inicio_carga)}–{formatearHoraLocal(envioSeleccionado.hora_fin_carga)} ({duracionCarga(envioSeleccionado.hora_inicio_carga, envioSeleccionado.hora_fin_carga)})
                </Text>
              ) : null}
              {envioSeleccionado?.transportista_empresa ? (
                <Text style={estilos.modalInfoTexto}>
                  Transporte: {envioSeleccionado.transportista_empresa}
                  {envioSeleccionado.transportista_chofer
                    ? ` · ${envioSeleccionado.transportista_chofer}`
                    : ''}
                </Text>
              ) : null}
              {envioSeleccionado?.observaciones ? (
                <Text style={estilos.modalInfoTexto}>
                  Obs.: {envioSeleccionado.observaciones}
                </Text>
              ) : null}
              {envioSeleccionado?.gps_lat && envioSeleccionado?.gps_lng && (
                <Text style={estilos.modalInfoTexto}>
                  GPS: {parseFloat(envioSeleccionado.gps_lat).toFixed(4)},{' '}
                  {parseFloat(envioSeleccionado.gps_lng).toFixed(4)}
                </Text>
              )}
            </View>

            {/* Fardos */}
            {cargandoDetalle ? (
              <ActivityIndicator
                size="small"
                color={COLORES.primario}
                style={{ marginVertical: 24 }}
              />
            ) : (
              <>
                {/* Stats */}
                <View style={estilos.statsRow}>
                  {[
                    { label: 'Válidos', color: COLORES.valido, count: fardosDetalle.filter(f => f.valido === 1).length },
                    { label: 'Inválidos', color: COLORES.invalido, count: fardosDetalle.filter(f => f.valido === 0).length },
                    { label: 'Total', color: COLORES.primario, count: fardosDetalle.length },
                  ].map(({ label, color, count }) => (
                    <View key={label} style={[estilos.statBox, { borderColor: color }]}>
                      <Text style={[estilos.statNum, { color }]}>{count}</Text>
                      <Text style={estilos.statLabel}>{label}</Text>
                    </View>
                  ))}
                </View>

                {/* Lista de fardos */}
                <ScrollView style={estilos.listaFardos} nestedScrollEnabled>
                  {fardosDetalle.map((f, i) => {
                    const esValido = f.valido === 1;
                    const esDuplicado = !esValido && f.motivo_invalido?.toLowerCase().includes('duplicado');
                    const colorEstado = esValido ? COLORES.valido : esDuplicado ? COLORES.duplicado : COLORES.invalido;
                    return (
                      <View key={f.id} style={[estilos.filaFardo, i % 2 === 0 && estilos.filaFardoPar]}>
                        <Text style={estilos.filaNum}>{i + 1}</Text>
                        <Text style={estilos.filaQR} numberOfLines={1}>{f.codigo_qr}</Text>
                        <Text style={[estilos.filaEstado, { color: colorEstado }]}>
                          {esValido ? '✓ OK' : esDuplicado ? 'DUP' : '✗'}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Botón Reenviar PDF */}
            <TouchableOpacity
              style={[estilos.botonPDF, (reenviandoPDF || cargandoDetalle) && estilos.botonDeshabilitado]}
              onPress={manejarReenviarPDF}
              disabled={reenviandoPDF || cargandoDetalle}
            >
              {reenviandoPDF ? (
                <ActivityIndicator color={COLORES.textoBlanco} />
              ) : (
                <Text style={estilos.botonPDFTexto}>📄 Reenviar PDF por WhatsApp</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },

  // ── Navegación de fecha ────────────────────────────────────────────────────
  navFecha: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORES.primario, paddingVertical: 10, paddingHorizontal: 8,
  },
  botonDia: {
    paddingHorizontal: 14, paddingVertical: 6,
  },
  botonDiaTexto: { fontSize: 26, color: COLORES.textoBlanco, fontWeight: '300' },
  fechaContenedor: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  fechaTexto: { color: COLORES.textoBlanco, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  hoyBadge: {
    backgroundColor: COLORES.acento, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
    fontSize: 10, color: COLORES.textoBlanco, fontWeight: 'bold',
  },
  botonTodos: {
    marginLeft: 4, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, borderWidth: 1, borderColor: COLORES.sobrePrimario,
  },
  botonTodosActivo: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  botonTodosTexto: { color: COLORES.textoBlanco, fontSize: 11, fontWeight: '600' },

  // ── Resumen del día ────────────────────────────────────────────────────────
  resumenDia: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORES.fondoInfo, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORES.borde,
  },
  resumenTexto: { fontSize: 12, color: COLORES.textoClaro },
  botonHoyTexto: { fontSize: 12, color: COLORES.primario, fontWeight: '600' },

  // ── Lista ──────────────────────────────────────────────────────────────────
  lista: { paddingBottom: 16 },
  separador: { height: 1, backgroundColor: COLORES.borde, marginLeft: 16 },
  itemEnvio: {
    backgroundColor: COLORES.fondoTarjeta,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  itemFila: { flexDirection: 'row', alignItems: 'center' },
  codigoBadge: {
    backgroundColor: COLORES.primario, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, marginRight: 12,
  },
  codigoTexto: { color: COLORES.textoBlanco, fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
  itemDatos: { flex: 1 },
  nombreAgricultor: { fontSize: 14, color: COLORES.texto, fontWeight: '500' },
  itemTransporte: { fontSize: 11, color: COLORES.textoClaro, marginTop: 1 },
  itemMeta: { fontSize: 12, color: COLORES.textoClaro, marginTop: 2 },
  syncCol: { alignItems: 'center', minWidth: 64 },
  syncIcono: { fontSize: 16, fontWeight: 'bold' },
  syncLabel: { fontSize: 9, textAlign: 'center' },

  // ── Estado vacío ──────────────────────────────────────────────────────────
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  textoVacio: { fontSize: 14, color: COLORES.textoClaro, textAlign: 'center', lineHeight: 22 },
  botonHoy: {
    marginTop: 16, backgroundColor: COLORES.primario,
    borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10,
  },
  botonHoyTextoBtn: { color: COLORES.textoBlanco, fontSize: 14, fontWeight: '600' },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalFondo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCaja: {
    backgroundColor: COLORES.fondoTarjeta,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%', padding: 16,
  },
  modalCabecera: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalTitulo: { fontSize: 16, fontWeight: 'bold', color: COLORES.texto },
  modalSubtitulo: { fontSize: 12, color: COLORES.textoClaro, marginTop: 2 },
  botonCerrar: { padding: 4, marginLeft: 8 },
  botonCerrarTexto: { fontSize: 18, color: COLORES.textoClaro },
  modalInfoBand: {
    backgroundColor: COLORES.fondoInfo, borderRadius: 8,
    padding: 10, marginBottom: 12,
  },
  modalInfoTexto: { fontSize: 12, color: COLORES.textoClaro, marginBottom: 2 },

  // ── Stats fardos ──────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statBox: {
    flex: 1, borderWidth: 1.5, borderRadius: 8,
    backgroundColor: COLORES.fondo, paddingVertical: 8, alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: COLORES.textoClaro, marginTop: 2 },

  // ── Lista fardos en modal ─────────────────────────────────────────────────
  listaFardos: { maxHeight: 220, marginBottom: 12 },
  filaFardo: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 4,
  },
  filaFardoPar: { backgroundColor: COLORES.fondo },
  filaNum: { width: 28, fontSize: 11, color: COLORES.textoClaro, textAlign: 'right', marginRight: 8 },
  filaQR: { flex: 1, fontSize: 11, fontFamily: 'monospace', color: COLORES.texto },
  filaEstado: { width: 38, fontSize: 11, fontWeight: 'bold', textAlign: 'right' },

  // ── Botón PDF ─────────────────────────────────────────────────────────────
  botonPDF: {
    backgroundColor: COLORES.info, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  botonPDFTexto: { color: COLORES.textoBlanco, fontSize: 14, fontWeight: 'bold' },
  botonDeshabilitado: { opacity: 0.6 },
});

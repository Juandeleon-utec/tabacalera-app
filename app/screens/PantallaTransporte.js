import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, FlatList, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { listarTransportistas, crearEnvio } from '../services/baseDeDatos';
import { generarIdLocal } from '../utils/uuid';
import COLORES from '../constants/colores';

export default function PantallaTransporte({ navigation, route }) {
  const { agricultor, sesion, gps } = route.params;

  const [transportistas, setTransportistas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [choferesFiltrados, setChoferesFiltrados] = useState([]);
  const [transportistaSeleccionado, setTransportistaSeleccionado] = useState(null);
  const [documentoChofer, setDocumentoChofer] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalChofer, setModalChofer] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    cargarTransportistas();
  }, []);

  async function cargarTransportistas() {
    try {
      const lista = await listarTransportistas();
      setTransportistas(lista);
      const uniqueEmpresas = [...new Set(lista.map((t) => t.empresa))].sort();
      setEmpresas(uniqueEmpresas);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los transportistas');
    } finally {
      setCargando(false);
    }
  }

  function seleccionarEmpresa(empresa) {
    setEmpresaSeleccionada(empresa);
    setTransportistaSeleccionado(null);
    setDocumentoChofer('');
    const filtrados = transportistas.filter((t) => t.empresa === empresa);
    setChoferesFiltrados(filtrados);
    setModalEmpresa(false);
  }

  function seleccionarChofer(transportista) {
    setTransportistaSeleccionado(transportista);
    setDocumentoChofer(transportista.documento || '');
    setModalChofer(false);
  }

  async function comenzarEscaneo() {
    if (!empresaSeleccionada || !transportistaSeleccionado) return;

    setIniciando(true);
    try {
      const ahora = new Date();
      const fecha = ahora.toISOString().split('T')[0];
      const hora = ahora.toTimeString().split(' ')[0];
      const idLocal = generarIdLocal();

      const envioId = await crearEnvio({
        id_local: idLocal,
        usuario_id: sesion?.id || 0,
        agricultor_id: agricultor.id,
        agricultor_codigo: agricultor.codigo_6dig,
        agricultor_nombre: agricultor.nombre,
        transportista_id: transportistaSeleccionado.id,
        documento_chofer_real: documentoChofer.trim() || null,
        observaciones: observaciones.trim() || null,
        fecha,
        hora,
        gps_lat: gps?.lat || null,
        gps_lng: gps?.lng || null,
      });

      navigation.navigate('Escaner', {
        envioId,
        idLocal,
        agricultor,
        transportista: transportistaSeleccionado,
        documentoChoferReal: documentoChofer.trim() || null,
        observaciones: observaciones.trim() || null,
        sesion,
        fecha,
        hora,
        gps,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el envío');
      console.error('[CREAR ENVIO]', error);
    } finally {
      setIniciando(false);
    }
  }

  const puedeComenzar = !!empresaSeleccionada && !!transportistaSeleccionado;

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.fondo }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={estilos.scrollContent}
      keyboardShouldPersistTaps="handled">

      {/* Info del agricultor */}
      <View style={estilos.agricultorBand}>
        <View style={estilos.codigoBadge}>
          <Text style={estilos.codigoTexto}>{agricultor.codigo_6dig}</Text>
        </View>
        <Text style={estilos.agricultorNombre}>{agricultor.nombre}</Text>
      </View>

      <Text style={estilos.seccionTitulo}>DATOS DEL TRANSPORTE</Text>

      {transportistas.length === 0 ? (
        <View style={estilos.aviso}>
          <Text style={estilos.avisoTexto}>
            No hay transportistas cargados.{'\n'}Realice una sincronización desde el panel administrador.
          </Text>
        </View>
      ) : (
        <>
          {/* Empresa transportista */}
          <Text style={estilos.label}>Empresa transportista *</Text>
          <TouchableOpacity
            style={[estilos.selector, empresaSeleccionada && estilos.selectorActivo]}
            onPress={() => setModalEmpresa(true)}
          >
            <Text style={empresaSeleccionada ? estilos.selectorTexto : estilos.selectorPlaceholder}>
              {empresaSeleccionada || 'Seleccione una empresa...'}
            </Text>
            <Text style={estilos.chevron}>›</Text>
          </TouchableOpacity>

          {/* Chofer */}
          <Text style={estilos.label}>Chofer *</Text>
          <TouchableOpacity
            style={[
              estilos.selector,
              !empresaSeleccionada && estilos.selectorDeshabilitado,
              transportistaSeleccionado && estilos.selectorActivo,
            ]}
            onPress={() => empresaSeleccionada && setModalChofer(true)}
            disabled={!empresaSeleccionada}
          >
            <Text style={transportistaSeleccionado ? estilos.selectorTexto : estilos.selectorPlaceholder}>
              {transportistaSeleccionado?.nombre_chofer || 'Seleccione un chofer...'}
            </Text>
            <Text style={estilos.chevron}>›</Text>
          </TouchableOpacity>

          {/* Matrícula (solo lectura, informativa) */}
          {transportistaSeleccionado && (
            <View style={estilos.matriculaInfo}>
              <Text style={estilos.matriculaLabel}>Matrícula: </Text>
              <Text style={estilos.matriculaValor}>{transportistaSeleccionado.matricula}</Text>
            </View>
          )}

          {/* Documento del chofer */}
          <Text style={estilos.label}>Documento del chofer (opcional)</Text>
          <TextInput
            style={estilos.input}
            value={documentoChofer}
            onChangeText={setDocumentoChofer}
            placeholder="Nº de documento..."
            placeholderTextColor={COLORES.textoMuyClaro}
            keyboardType="numeric"
            maxLength={20}
          />

          {/* Observaciones */}
          <Text style={estilos.label}>Observaciones (opcional)</Text>
          <TextInput
            style={[estilos.input, estilos.inputMultilinea]}
            value={observaciones}
            onChangeText={(t) => setObservaciones(t.slice(0, 50))}
            placeholder="Anotaciones del operador..."
            placeholderTextColor={COLORES.textoMuyClaro}
            multiline
            maxLength={50}
          />
          <Text style={estilos.contador}>{observaciones.length}/50</Text>
        </>
      )}

      {/* Botón comenzar */}
      <TouchableOpacity
        style={[estilos.botonComenzar, !puedeComenzar && estilos.botonDeshabilitado]}
        onPress={comenzarEscaneo}
        disabled={!puedeComenzar || iniciando}
      >
        {iniciando ? (
          <ActivityIndicator color={COLORES.textoBlanco} />
        ) : (
          <Text style={estilos.botonComenzarTexto}>Comenzar escaneo</Text>
        )}
      </TouchableOpacity>

      {/* Modal empresa */}
      <Modal visible={modalEmpresa} transparent animationType="slide" onRequestClose={() => setModalEmpresa(false)}>
        <View style={estilos.modalFondo}>
          <View style={estilos.modalCaja}>
            <View style={estilos.modalCabecera}>
              <Text style={estilos.modalTitulo}>Seleccione empresa</Text>
              <TouchableOpacity onPress={() => setModalEmpresa(false)}>
                <Text style={estilos.modalCerrar}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={empresas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[estilos.opcion, empresaSeleccionada === item && estilos.opcionActiva]}
                  onPress={() => seleccionarEmpresa(item)}
                >
                  <Text style={[estilos.opcionTexto, empresaSeleccionada === item && estilos.opcionTextoActivo]}>
                    {item}
                  </Text>
                  {empresaSeleccionada === item && <Text style={estilos.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={estilos.separador} />}
            />
          </View>
        </View>
      </Modal>

      {/* Modal chofer */}
      <Modal visible={modalChofer} transparent animationType="slide" onRequestClose={() => setModalChofer(false)}>
        <View style={estilos.modalFondo}>
          <View style={estilos.modalCaja}>
            <View style={estilos.modalCabecera}>
              <Text style={estilos.modalTitulo}>Seleccione chofer</Text>
              <TouchableOpacity onPress={() => setModalChofer(false)}>
                <Text style={estilos.modalCerrar}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={choferesFiltrados}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[estilos.opcion, transportistaSeleccionado?.id === item.id && estilos.opcionActiva]}
                  onPress={() => seleccionarChofer(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[estilos.opcionTexto, transportistaSeleccionado?.id === item.id && estilos.opcionTextoActivo]}>
                      {item.nombre_chofer}
                    </Text>
                    <Text style={estilos.opcionSubtexto}>Matrícula: {item.matricula}</Text>
                  </View>
                  {transportistaSeleccionado?.id === item.id && <Text style={estilos.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={estilos.separador} />}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scrollContent: { padding: 16, paddingBottom: 32 },

  agricultorBand: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORES.fondoInfo, borderRadius: 8,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: COLORES.borde,
  },
  codigoBadge: {
    backgroundColor: COLORES.primario, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginRight: 10,
  },
  codigoTexto: { color: COLORES.textoBlanco, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' },
  agricultorNombre: { fontSize: 15, color: COLORES.texto, fontWeight: '600', flex: 1 },

  seccionTitulo: {
    fontSize: 11, fontWeight: '700', color: COLORES.textoClaro,
    letterSpacing: 0.8, marginBottom: 16,
  },

  aviso: {
    backgroundColor: COLORES.fondoAlerta, borderRadius: 8,
    padding: 16, marginBottom: 20,
  },
  avisoTexto: { fontSize: 13, color: COLORES.textoClaro, textAlign: 'center', lineHeight: 20 },

  label: {
    fontSize: 12, fontWeight: '600', color: COLORES.textoClaro,
    marginBottom: 6, marginTop: 14,
  },
  selector: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORES.bordeInput, borderRadius: 8,
    backgroundColor: COLORES.fondoInputAlt, paddingHorizontal: 12, paddingVertical: 13,
  },
  selectorActivo: { borderColor: COLORES.primario },
  selectorDeshabilitado: { opacity: 0.5 },
  selectorTexto: { flex: 1, fontSize: 14, color: COLORES.texto },
  selectorPlaceholder: { flex: 1, fontSize: 14, color: COLORES.textoMuyClaro },
  chevron: { fontSize: 22, color: COLORES.textoClaro },

  matriculaInfo: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 6, paddingHorizontal: 4,
  },
  matriculaLabel: { fontSize: 12, color: COLORES.textoClaro },
  matriculaValor: { fontSize: 12, color: COLORES.texto, fontWeight: '600', fontFamily: 'monospace' },

  input: {
    borderWidth: 1, borderColor: COLORES.bordeInput, borderRadius: 8,
    backgroundColor: COLORES.fondoInputAlt, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: COLORES.texto,
  },
  inputMultilinea: { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 },
  contador: { fontSize: 11, color: COLORES.textoMuyClaro, textAlign: 'right', marginTop: 4 },

  botonComenzar: {
    marginTop: 28, backgroundColor: COLORES.primario,
    borderRadius: 10, padding: 16, alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.45 },
  botonComenzarTexto: { color: COLORES.textoBlanco, fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: COLORES.fondoTarjeta,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '70%', paddingBottom: 20,
  },
  modalCabecera: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORES.borde,
  },
  modalTitulo: { fontSize: 16, fontWeight: 'bold', color: COLORES.texto },
  modalCerrar: { fontSize: 18, color: COLORES.textoClaro, padding: 4 },
  opcion: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  opcionActiva: { backgroundColor: COLORES.fondoInfo },
  opcionTexto: { fontSize: 14, color: COLORES.texto, flex: 1 },
  opcionTextoActivo: { color: COLORES.primario, fontWeight: '600' },
  opcionSubtexto: { fontSize: 12, color: COLORES.textoClaro, marginTop: 2 },
  checkmark: { fontSize: 16, color: COLORES.primario, marginLeft: 8 },
  separador: { height: 1, backgroundColor: COLORES.borde, marginHorizontal: 16 },
});

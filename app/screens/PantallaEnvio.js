import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, FlatList,
} from 'react-native';
import { listarFardosPorEnvio, obtenerEnvioPorId, cerrarEnvio } from '../services/baseDeDatos';
import { generarPDFEnvio, compartirPDF } from '../services/generadorPDF';
import ItemFardo from '../components/ItemFardo';

const COLORES = {
  primario: '#1B4332',
  valido: '#16A34A',
  invalido: '#DC2626',
  fondo: '#F5F5F0',
  texto: '#1A1A1A',
  textoClaro: '#6B7280',
};

export default function PantallaEnvio({ navigation, route }) {
  const { envioId, idLocal, agricultor, sesion, fecha, hora, gps } = route.params;

  const [fardos, setFardos] = useState([]);
  const [envio, setEnvio] = useState(null);
  const [cerrado, setCerrado] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      const [listaFardos, datosEnvio] = await Promise.all([
        listarFardosPorEnvio(envioId),
        obtenerEnvioPorId(envioId),
      ]);
      setFardos(listaFardos);
      setEnvio(datosEnvio);
      if (datosEnvio?.estado === 'cerrado') setCerrado(true);
    } finally {
      setCargando(false);
    }
  }

  const totalValidos = fardos.filter((f) => f.valido === 1).length;
  const totalInvalidos = fardos.filter((f) => f.valido === 0).length;

  async function manejarCerrarEnvio() {
    Alert.alert(
      'Cerrar envío',
      `¿Confirma cerrar el envío con ${totalValidos} fardos válidos?\nNo podrá agregar más fardos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar envío', onPress: ejecutarCierre },
      ]
    );
  }

  async function ejecutarCierre() {
    try {
      await cerrarEnvio(envioId);
      setCerrado(true);
      Alert.alert('Envío cerrado', 'El envío fue cerrado. Ahora puede generar el PDF.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar el envío');
    }
  }

  async function manejarGenerarPDF() {
    setGenerandoPDF(true);
    try {
      const datosEnvio = {
        ...envio,
        agricultor_codigo: agricultor.codigo_6dig,
        agricultor_nombre: agricultor.nombre,
        comprador_nombre: sesion?.nombre,
      };
      const rutaPDF = await generarPDFEnvio(datosEnvio, fardos);
      await compartirPDF(rutaPDF);
    } catch (error) {
      Alert.alert('Error al generar PDF', error.message);
      console.error('[PDF]', error);
    } finally {
      setGenerandoPDF(false);
    }
  }

  function manejarNuevoEnvio() {
    navigation.navigate('Inicio', { sesion });
  }

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      {/* Resumen del envío */}
      <View style={estilos.cabecera}>
        <Text style={estilos.tituloAgricultor}>{agricultor.nombre}</Text>
        <Text style={estilos.subtituloAgricultor}>Código: {agricultor.codigo_6dig}</Text>
        <View style={estilos.filaFecha}>
          <Text style={estilos.fecha}>{fecha}  {hora}</Text>
          {gps && (
            <Text style={estilos.gps}>
              📍 {parseFloat(gps.lat).toFixed(4)}, {parseFloat(gps.lng).toFixed(4)}
            </Text>
          )}
        </View>

        {/* Estadísticas */}
        <View style={estilos.estadisticas}>
          <View style={[estilos.stat, { borderColor: COLORES.valido }]}>
            <Text style={[estilos.statNum, { color: COLORES.valido }]}>{totalValidos}</Text>
            <Text style={estilos.statLabel}>Válidos</Text>
          </View>
          <View style={[estilos.stat, { borderColor: COLORES.invalido }]}>
            <Text style={[estilos.statNum, { color: COLORES.invalido }]}>{totalInvalidos}</Text>
            <Text style={estilos.statLabel}>Inválidos</Text>
          </View>
          <View style={[estilos.stat, { borderColor: COLORES.primario }]}>
            <Text style={[estilos.statNum, { color: COLORES.primario }]}>{fardos.length}</Text>
            <Text style={estilos.statLabel}>Total</Text>
          </View>
        </View>

        {/* Estado */}
        <View style={[estilos.estadoBadge, cerrado ? estilos.estadoCerrado : estilos.estadoAbierto]}>
          <Text style={estilos.estadoTexto}>{cerrado ? '✓ CERRADO' : 'ABIERTO'}</Text>
        </View>
      </View>

      {/* Lista de fardos */}
      <FlatList
        data={fardos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ItemFardo fardo={item} mostrarMotivo />}
        style={estilos.lista}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <Text style={estilos.tituloLista}>Fardos escaneados ({fardos.length})</Text>
        }
      />

      {/* Acciones inferiores */}
      <View style={estilos.botonesInferiores}>
        {!cerrado ? (
          <TouchableOpacity style={estilos.botonCerrar} onPress={manejarCerrarEnvio}>
            <Text style={estilos.textoBoton}>Cerrar envío</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[estilos.botonPDF, generandoPDF && estilos.botonDeshabilitado]}
              onPress={manejarGenerarPDF}
              disabled={generandoPDF}
            >
              {generandoPDF ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={estilos.textoBoton}>📄 Generar y compartir PDF</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botonNuevo} onPress={manejarNuevoEnvio}>
              <Text style={estilos.textoBotonNuevo}>Nuevo envío</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  cabecera: {
    backgroundColor: COLORES.primario, padding: 16, paddingTop: 12,
  },
  tituloAgricultor: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  subtituloAgricultor: { color: '#A7F3D0', fontSize: 13, marginTop: 2 },
  filaFecha: { marginTop: 6 },
  fecha: { color: '#D1FAE5', fontSize: 13 },
  gps: { color: '#A7F3D0', fontSize: 11, marginTop: 2 },
  estadisticas: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1.5,
  },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#D1FAE5', marginTop: 2 },
  estadoBadge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10,
    paddingVertical: 4, marginTop: 10,
  },
  estadoAbierto: { backgroundColor: '#D97706' },
  estadoCerrado: { backgroundColor: '#16A34A' },
  estadoTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  tituloLista: {
    padding: 14, fontSize: 13, fontWeight: '600',
    color: COLORES.textoClaro, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  lista: { flex: 1, backgroundColor: '#FFFFFF' },
  botonesInferiores: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    gap: 10,
  },
  botonCerrar: {
    backgroundColor: COLORES.primario, borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  botonPDF: {
    backgroundColor: '#2563EB', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  botonNuevo: {
    borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  textoBotonNuevo: { color: COLORES.primario, fontSize: 15, fontWeight: '600' },
});

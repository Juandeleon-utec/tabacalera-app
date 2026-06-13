import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { cerrarSesion } from '../services/autenticacion';
import { sincronizacionInicial } from '../services/sincronizacion';
import { obtenerInfoSync } from '../services/baseDeDatos';

const COLORES = {
  primario: '#1B4332',
  secundario: '#2D6A4F',
  acento: '#52B788',
  peligro: '#C0392B',
  fondo: '#F5F5F0',
  texto: '#1A1A1A',
  textoClaro: '#6B7280',
};

export default function PantallaAdmin({ navigation }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajProgreso, setMensajeProgreso] = useState('');
  const [infoSync, setInfoSync] = useState(null);
  const [resultadoSync, setResultadoSync] = useState(null);

  useEffect(() => {
    cargarInfoSync();
  }, []);

  async function cargarInfoSync() {
    const info = await obtenerInfoSync();
    setInfoSync(info);
  }

  async function manejarSync() {
    Alert.alert(
      'Confirmar sincronización',
      'Se descargarán usuarios y agricultores desde el servidor.\n¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sincronizar', onPress: ejecutarSync },
      ]
    );
  }

  async function ejecutarSync() {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const resultado = await sincronizacionInicial((mensaje) => {
        setMensajeProgreso(mensaje);
      });
      setResultadoSync(resultado);
      await cargarInfoSync();
    } catch (error) {
      Alert.alert('Error de sincronización', error.message);
    } finally {
      setSincronizando(false);
    }
  }

  async function manejarSalir() {
    await cerrarSesion();
    navigation.replace('Login');
  }

  const ultimaSync = infoSync?.ultima_sync
    ? new Date(infoSync.ultima_sync).toLocaleString('es-UY')
    : 'Nunca realizada';

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={estilos.contenido}>
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>Panel de Administración</Text>
        <Text style={estilos.subtitulo}>Superadmin</Text>
      </View>

      <View style={estilos.tarjeta}>
        <Text style={estilos.tituloTarjeta}>Estado de sincronización</Text>
        <Text style={estilos.dato}>
          <Text style={estilos.etiqueta}>Última sync: </Text>
          {ultimaSync}
        </Text>
      </View>

      {resultadoSync && (
        <View style={[estilos.tarjeta, estilos.tarjetaExito]}>
          <Text style={estilos.tituloExito}>✓ Sincronización exitosa</Text>
          <Text style={estilos.dato}>Usuarios descargados: {resultadoSync.usuarios}</Text>
          <Text style={estilos.dato}>Agricultores descargados: {resultadoSync.agricultores}</Text>
          <Text style={estilos.dato}>
            Realizada: {new Date(resultadoSync.sync_at).toLocaleString('es-UY')}
          </Text>
        </View>
      )}

      {sincronizando && (
        <View style={estilos.tarjetaProgreso}>
          <ActivityIndicator size="small" color={COLORES.primario} />
          <Text style={estilos.textoProgreso}>{mensajProgreso}</Text>
        </View>
      )}

      <View style={estilos.instrucciones}>
        <Text style={estilos.tituloInstrucciones}>Instrucciones</Text>
        <Text style={estilos.textoInstrucciones}>
          1. Conecte el dispositivo a la red WiFi interna.{'\n'}
          2. Presione "Sincronizar ahora".{'\n'}
          3. Espere a que finalice la descarga.{'\n'}
          4. Los compradores de campo podrán ingresar desde esta pantalla.{'\n'}
          5. La sesión vence a los 7 días sin sincronizar.
        </Text>
      </View>

      <TouchableOpacity
        style={[estilos.botonSync, sincronizando && estilos.botonDeshabilitado]}
        onPress={manejarSync}
        disabled={sincronizando}
      >
        {sincronizando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={estilos.textoBoton}>⬇  Sincronizar ahora</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={estilos.botonSalir}
        onPress={manejarSalir}
        disabled={sincronizando}
      >
        <Text style={estilos.textoBotonSalir}>Cerrar sesión admin</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F5F5F0' },
  contenido: { padding: 20 },
  cabecera: { marginBottom: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: COLORES.primario },
  subtitulo: { fontSize: 13, color: COLORES.textoClaro, marginTop: 2 },
  tarjeta: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tarjetaExito: { borderLeftWidth: 4, borderLeftColor: '#2D6A4F' },
  tituloTarjeta: { fontSize: 14, fontWeight: '600', color: COLORES.textoClaro, marginBottom: 8 },
  tituloExito: { fontSize: 14, fontWeight: 'bold', color: COLORES.secundario, marginBottom: 8 },
  etiqueta: { fontWeight: '600' },
  dato: { fontSize: 14, color: COLORES.texto, marginBottom: 4 },
  tarjetaProgreso: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF4FF',
    padding: 14, borderRadius: 8, marginBottom: 16, gap: 10,
  },
  textoProgreso: { fontSize: 14, color: COLORES.primario, flex: 1 },
  instrucciones: {
    backgroundColor: '#F0F7F4', borderRadius: 8, padding: 14, marginBottom: 20,
  },
  tituloInstrucciones: { fontSize: 13, fontWeight: '600', color: COLORES.primario, marginBottom: 8 },
  textoInstrucciones: { fontSize: 13, color: COLORES.texto, lineHeight: 20 },
  botonSync: {
    backgroundColor: COLORES.primario, borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  botonDeshabilitado: { opacity: 0.5 },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  botonSalir: {
    borderWidth: 1.5, borderColor: COLORES.peligro, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  textoBotonSalir: { color: COLORES.peligro, fontSize: 15, fontWeight: '600' },
});

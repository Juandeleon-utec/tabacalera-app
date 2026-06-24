import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { listarAgricultores, buscarAgricultores } from '../services/baseDeDatos';
import { sincronizarEnviosPendientes, hayConectividadConServidor, actualizarTransportistas } from '../services/sincronizacion';
import { cerrarSesion } from '../services/autenticacion';
import COLORES from '../constants/colores';

export default function PantallaInicio({ navigation, route }) {
  const sesion = route.params?.sesion;
  const [agricultores, setAgricultores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [gps, setGps] = useState(null);
  const [sincronizandoAuto, setSincronizandoAuto] = useState(false);
  const [hayConexion, setHayConexion] = useState(false);
  const [actualizandoTransp, setActualizandoTransp] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Historial', { sesion })}
          style={{ marginRight: 4, paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>
            Historial
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, sesion]);

  useEffect(() => {
    cargarAgricultores();
    solicitarUbicacion();
    ejecutarSyncAutomatica();
  }, []);

  useEffect(() => {
    if (busqueda.trim().length >= 2) {
      buscarAgricultoresLocal(busqueda);
    } else if (busqueda.trim().length === 0) {
      cargarAgricultores();
    }
  }, [busqueda]);

  async function cargarAgricultores() {
    try {
      const lista = await listarAgricultores();
      setAgricultores(lista);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los agricultores');
    } finally {
      setCargando(false);
    }
  }

  async function buscarAgricultoresLocal(termino) {
    const lista = await buscarAgricultores(termino);
    setAgricultores(lista);
  }

  async function solicitarUbicacion() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const ubicacion = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setGps({
          lat: ubicacion.coords.latitude,
          lng: ubicacion.coords.longitude,
        });
      }
    } catch {
      // GPS opcional, no se muestra error
    }
  }

  async function ejecutarSyncAutomatica() {
    try {
      const conectado = await hayConectividadConServidor();
      setHayConexion(conectado);
      if (conectado) {
        setSincronizandoAuto(true);
        const resultado = await sincronizarEnviosPendientes();
        if (resultado.sincronizados > 0) {
          console.log(`[SYNC AUTO] ${resultado.sincronizados} envíos sincronizados`);
        }
      }
    } catch (error) {
      console.warn('[SYNC AUTO]', error.message);
    } finally {
      setSincronizandoAuto(false);
    }
  }

  async function manejarActualizarTransportistas() {
    if (!hayConexion) {
      Alert.alert('Sin conexión', 'Sin conexión al servidor. Conectate a la red interna.');
      return;
    }
    setActualizandoTransp(true);
    try {
      const { cantidad } = await actualizarTransportistas();
      Alert.alert('Transportistas actualizados', `${cantidad} transportista${cantidad !== 1 ? 's' : ''} actualizados.`);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron actualizar los transportistas.');
    } finally {
      setActualizandoTransp(false);
    }
  }

  function seleccionarAgricultor(agricultor) {
    navigation.navigate('Transporte', { agricultor, sesion, gps });
  }

  async function manejarCerrarSesion() {
    Alert.alert('Cerrar sesión', '¿Desea cerrar la sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await cerrarSesion();
          navigation.replace('Login');
        },
      },
    ]);
  }

  function renderAgricultor({ item }) {
    return (
      <TouchableOpacity
        style={estilos.itemAgricultor}
        onPress={() => seleccionarAgricultor(item)}
      >
        <View style={estilos.codigoBadge}>
          <Text style={estilos.codigoTexto}>{item.codigo_6dig}</Text>
        </View>
        <View style={estilos.datosAgricultor}>
          <Text style={estilos.nombreAgricultor}>{item.nombre}</Text>
          {item.departamento && (
            <Text style={estilos.departamento}>{item.departamento}</Text>
          )}
        </View>
        <Text style={estilos.flecha}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={estilos.contenedor}>
      {/* Barra superior */}
      <View style={estilos.barraInfo}>
        <View>
          <Text style={estilos.saludo}>Hola, {sesion?.nombre || 'Usuario'}</Text>
          {sincronizandoAuto && (
            <Text style={estilos.textSync}>⟳ Sincronizando envíos...</Text>
          )}
        </View>
        <TouchableOpacity onPress={manejarCerrarSesion}>
          <Text style={estilos.botonSalir}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* GPS Status */}
      {gps && (
        <View style={estilos.gpsBar}>
          <Text style={estilos.gpsTexto}>
            📍 GPS: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Buscador */}
      <View style={estilos.buscadorContenedor}>
        <TextInput
          style={estilos.buscador}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre o código..."
          placeholderTextColor={COLORES.textoClaro}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Botón actualizar transportistas */}
      <View style={estilos.barraAcciones}>
        <TouchableOpacity
          style={[estilos.botonActualizar, (!hayConexion || actualizandoTransp) && estilos.botonActualizarDeshabilitado]}
          onPress={manejarActualizarTransportistas}
          disabled={!hayConexion || actualizandoTransp}
        >
          {actualizandoTransp
            ? <ActivityIndicator size="small" color={COLORES.textoBlanco} style={{ marginRight: 6 }} />
            : null}
          <Text style={estilos.botonActualizarTexto}>
            {actualizandoTransp ? 'Actualizando...' : 'Actualizar transportistas'}
          </Text>
        </TouchableOpacity>
        {!hayConexion && (
          <Text style={estilos.textoSinConexion}>Sin conexión al servidor</Text>
        )}
      </View>

      <Text style={estilos.instruccion}>
        Seleccione el agricultor para iniciar el escaneo de fardos
      </Text>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORES.primario} />
      ) : agricultores.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}>
            {busqueda ? 'No se encontraron resultados' : 'No hay agricultores cargados.\nRealice una sincronización.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={agricultores}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAgricultor}
          contentContainerStyle={estilos.lista}
          ItemSeparatorComponent={() => <View style={estilos.separador} />}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  barraInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORES.primario, paddingHorizontal: 16, paddingVertical: 10,
  },
  saludo: { color: COLORES.textoBlanco, fontSize: 14, fontWeight: '600' },
  textSync: { color: COLORES.sobrePrimario, fontSize: 12, marginTop: 2 },
  botonSalir: { color: COLORES.sobrePrimario, fontSize: 14, fontWeight: '600' },
  gpsBar: { backgroundColor: COLORES.sobrePrimarioSuave, paddingHorizontal: 16, paddingVertical: 6 },
  gpsTexto: { fontSize: 12, color: COLORES.sobrePrimarioOscuro },
  buscadorContenedor: { padding: 12, backgroundColor: COLORES.fondoTarjeta },
  buscador: {
    borderWidth: 1, borderColor: COLORES.borde, borderRadius: 8,
    padding: 10, fontSize: 14, color: COLORES.texto, backgroundColor: COLORES.fondoInputAlt,
  },
  barraAcciones: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORES.fondoTarjeta,
    borderBottomWidth: 1, borderBottomColor: COLORES.borde,
  },
  botonActualizar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORES.acento, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  botonActualizarDeshabilitado: { backgroundColor: COLORES.secundario },
  botonActualizarTexto: { color: COLORES.textoBlanco, fontSize: 13, fontWeight: '600' },
  textoSinConexion: { fontSize: 11, color: COLORES.textoClaro, flex: 1 },
  instruccion: {
    fontSize: 13, color: COLORES.textoClaro, paddingHorizontal: 16,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORES.borde,
  },
  lista: { paddingBottom: 20 },
  separador: { height: 1, backgroundColor: COLORES.borde, marginLeft: 16 },
  itemAgricultor: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORES.fondoTarjeta, paddingVertical: 14, paddingHorizontal: 16,
  },
  codigoBadge: {
    backgroundColor: COLORES.primario, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginRight: 12,
  },
  codigoTexto: { color: COLORES.textoBlanco, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' },
  datosAgricultor: { flex: 1 },
  nombreAgricultor: { fontSize: 15, color: COLORES.texto, fontWeight: '500' },
  departamento: { fontSize: 12, color: COLORES.textoClaro, marginTop: 2 },
  flecha: { fontSize: 22, color: COLORES.textoClaro },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  textoVacio: { fontSize: 14, color: COLORES.textoClaro, textAlign: 'center', lineHeight: 22 },
});

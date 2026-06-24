import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Modal,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { login } from '../services/autenticacion';
import { CONFIG } from '../src/config/config';
import COLORES from '../constants/colores';

export default function PantallaLogin({ navigation }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  // ── Diagnóstico ───────────────────────────────────────────────────────────
  const [modalDiag, setModalDiag] = useState(false);
  const [diagCargando, setDiagCargando] = useState(false);
  const [diagResultado, setDiagResultado] = useState(null);

  async function ejecutarDiagnostico() {
    setDiagCargando(true);
    setDiagResultado(null);
    const resultado = { url: CONFIG.API_URL, timestamp: new Date().toLocaleTimeString('es-UY') };

    // 1. Estado de red via NetInfo
    try {
      const estado = await NetInfo.fetch();
      resultado.red = {
        tipo: estado.type,
        conectado: estado.isConnected ? 'SÍ' : 'NO',
        alcanzable: String(estado.isInternetReachable),
        ssid: estado.details?.ssid || 'N/D',
      };
    } catch (e) {
      resultado.red = { error: e.message };
    }

    // 2. Ping con fetch nativo (sin axios)
    try {
      const inicio = Date.now();
      const resp = await fetch(`${CONFIG.API_URL}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const texto = await resp.text();
      resultado.pingFetch = {
        ok: resp.ok,
        status: resp.status,
        ms: Date.now() - inicio,
        cuerpo: texto.substring(0, 200),
      };
    } catch (e) {
      resultado.pingFetch = {
        ok: false,
        tipo: e.name,
        error: e.message,
        codigo: e.code || 'sin código',
      };
    }

    // 3. Ping con XMLHttpRequest (capa más baja — independiente de fetch)
    try {
      const inicio = Date.now();
      const xhrResult = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 8000;
        xhr.open('GET', `${CONFIG.API_URL}/api/health`);
        xhr.onload = () =>
          resolve({ ok: xhr.status >= 200 && xhr.status < 400, status: xhr.status, text: xhr.responseText });
        xhr.onerror = () => reject(new Error(`XHR onerror (status=${xhr.status})`));
        xhr.ontimeout = () => reject(new Error('XHR timeout 8s'));
        xhr.send();
      });
      resultado.pingXHR = { ...xhrResult, ms: Date.now() - inicio };
    } catch (e) {
      resultado.pingXHR = { ok: false, error: e.message };
    }

    setDiagResultado(resultado);
    setDiagCargando(false);
  }

  function abrirDiagnostico() {
    setModalDiag(true);
    ejecutarDiagnostico();
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async function manejarLogin() {
    if (!nombreUsuario.trim() || !contrasena.trim()) {
      Alert.alert('Error', 'Ingrese usuario y contraseña');
      return;
    }

    setCargando(true);
    try {
      const resultado = await login(nombreUsuario.trim(), contrasena);

      if (!resultado.ok) {
        if (resultado.requiere_sync) {
          Alert.alert(
            'Sincronización requerida',
            resultado.error,
            [
              { text: 'Entendido', style: 'default' },
              {
                text: 'Ingresar como Admin',
                onPress: () => { setNombreUsuario(''); setContrasena(''); },
              },
            ]
          );
        } else {
          Alert.alert('Error de acceso', resultado.error);
        }
        return;
      }

      const { sesion } = resultado;
      if (sesion.rol === 'superadmin') {
        navigation.replace('Admin');
      } else {
        navigation.replace('Inicio', { sesion });
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado. Intente nuevamente.');
      console.error('[LOGIN]', error);
    } finally {
      setCargando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          {/* Long-press 3 segundos en el logo abre el diagnóstico */}
          <TouchableOpacity
            style={estilos.logoContenedor}
            onLongPress={abrirDiagnostico}
            delayLongPress={3000}
            activeOpacity={1}
          >
            <Image
              source={require('../assets/Montepaz_Blanco.png')}
              style={estilos.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={estilos.titulo}>Tabacalera</Text>
          <Text style={estilos.subtitulo}>Sistema de compra de fardos</Text>
        </View>

        <View style={estilos.formulario}>
          <Text style={estilos.etiqueta}>Usuario</Text>
          <TextInput
            style={estilos.entrada}
            value={nombreUsuario}
            onChangeText={setNombreUsuario}
            placeholder="Ingrese su usuario"
            placeholderTextColor={COLORES.textoClaro}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!cargando}
          />

          <Text style={estilos.etiqueta}>Contraseña</Text>
          <TextInput
            style={estilos.entrada}
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="Ingrese su contraseña"
            placeholderTextColor={COLORES.textoClaro}
            secureTextEntry
            editable={!cargando}
            onSubmitEditing={manejarLogin}
          />

          <TouchableOpacity
            style={[estilos.botonLogin, cargando && estilos.botonDeshabilitado]}
            onPress={manejarLogin}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color={COLORES.textoBlanco} />
            ) : (
              <Text style={estilos.textoBoton}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={estilos.nota}>
          La primera vez debe conectarse a la red interna WiFi{'\n'}
          e ingresar como administrador para sincronizar.
        </Text>
      </ScrollView>

      {/* ── Modal de diagnóstico de red ─────────────────────────────────── */}
      <Modal
        visible={modalDiag}
        transparent
        animationType="fade"
        onRequestClose={() => setModalDiag(false)}
      >
        <View style={estilos.modalFondo}>
          <View style={estilos.modalCaja}>
            <Text style={estilos.modalTitulo}>Diagnóstico de conexión</Text>

            {diagCargando ? (
              <View style={estilos.diagCargando}>
                <ActivityIndicator color={COLORES.primario} size="large" />
                <Text style={estilos.diagCargandoTexto}>Verificando red y servidor...</Text>
              </View>
            ) : diagResultado ? (
              <ScrollView style={estilos.diagScroll} showsVerticalScrollIndicator={false}>
                {/* URL configurada */}
                <FilaDiag etiqueta="URL configurada" />
                <Text style={[estilos.diagValor, estilos.mono]}>{diagResultado.url}</Text>
                <Text style={estilos.diagHora}>Verificado a las {diagResultado.timestamp}</Text>

                {/* Estado de red */}
                <Text style={estilos.diagSeccion}>Estado de red (NetInfo)</Text>
                {diagResultado.red?.error ? (
                  <Text style={estilos.diagError}>Error: {diagResultado.red.error}</Text>
                ) : (
                  <>
                    <FilaDiag etiqueta="Tipo" valor={diagResultado.red?.tipo} />
                    <FilaDiag etiqueta="Conectado" valor={diagResultado.red?.conectado}
                      ok={diagResultado.red?.conectado === 'SÍ'} />
                    <FilaDiag etiqueta="Alcanzable" valor={diagResultado.red?.alcanzable} />
                    <FilaDiag etiqueta="Red WiFi (SSID)" valor={diagResultado.red?.ssid} />
                  </>
                )}

                {/* Ping fetch */}
                <Text style={estilos.diagSeccion}>Test 1: fetch() nativo</Text>
                {diagResultado.pingFetch?.ok ? (
                  <>
                    <FilaDiag etiqueta="Estado" valor={`✓ ÉXITO (${diagResultado.pingFetch.ms} ms)`} ok />
                    <FilaDiag etiqueta="HTTP" valor={String(diagResultado.pingFetch.status)} />
                    <Text style={[estilos.diagValor, estilos.mono, estilos.diagCuerpo]}>
                      {diagResultado.pingFetch.cuerpo}
                    </Text>
                  </>
                ) : (
                  <>
                    <FilaDiag etiqueta="Estado" valor="✗ FALLO" mal />
                    <FilaDiag etiqueta="Tipo" valor={diagResultado.pingFetch?.tipo} />
                    <FilaDiag etiqueta="Código" valor={diagResultado.pingFetch?.codigo} />
                    <Text style={[estilos.diagError, estilos.diagCuerpo]}>
                      {diagResultado.pingFetch?.error}
                    </Text>
                  </>
                )}

                {/* Ping XMLHttpRequest */}
                <Text style={estilos.diagSeccion}>Test 2: XMLHttpRequest (capa baja)</Text>
                {diagResultado.pingXHR?.ok ? (
                  <>
                    <FilaDiag etiqueta="Estado" valor={`✓ ÉXITO (${diagResultado.pingXHR.ms} ms)`} ok />
                    <FilaDiag etiqueta="HTTP" valor={String(diagResultado.pingXHR.status)} />
                    <Text style={[estilos.diagValor, estilos.mono, estilos.diagCuerpo]}>
                      {diagResultado.pingXHR.text?.substring(0, 150)}
                    </Text>
                  </>
                ) : (
                  <>
                    <FilaDiag etiqueta="Estado" valor="✗ FALLO" mal />
                    <Text style={[estilos.diagError, estilos.diagCuerpo]}>
                      {diagResultado.pingXHR?.error}
                    </Text>
                  </>
                )}
              </ScrollView>
            ) : null}

            {/* Botones */}
            <View style={estilos.diagBotones}>
              {!diagCargando && (
                <TouchableOpacity
                  style={estilos.botonReejecutar}
                  onPress={ejecutarDiagnostico}
                >
                  <Text style={estilos.botonReejecutarTexto}>Reintentar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={estilos.botonCerrarModal}
                onPress={() => setModalDiag(false)}
              >
                <Text style={estilos.botonCerrarModalTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Componente auxiliar de fila de diagnóstico ────────────────────────────────
function FilaDiag({ etiqueta, valor, ok, mal }) {
  const colorValor = ok ? COLORES.valido : mal ? COLORES.invalido : COLORES.texto;
  return (
    <View style={{ flexDirection: 'row', marginBottom: 3 }}>
      <Text style={estilos.diagEtiqueta}>{etiqueta}: </Text>
      {valor !== undefined && (
        <Text style={[estilos.diagValor, { color: colorValor }]}>{valor}</Text>
      )}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  cabecera: { alignItems: 'center', marginBottom: 40 },
  logoContenedor: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORES.primario, justifyContent: 'center',
    alignItems: 'center', marginBottom: 16, overflow: 'hidden',
  },
  logo: { width: 80, height: 80 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: COLORES.primario },
  subtitulo: { fontSize: 14, color: COLORES.textoClaro, marginTop: 4 },
  formulario: {
    backgroundColor: COLORES.fondoTarjeta, borderRadius: 12, padding: 24,
    shadowColor: COLORES.sombra, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  etiqueta: { fontSize: 13, fontWeight: '600', color: COLORES.texto, marginBottom: 6 },
  entrada: {
    borderWidth: 1, borderColor: COLORES.bordeInput, borderRadius: 8,
    padding: 12, fontSize: 15, color: COLORES.texto,
    backgroundColor: COLORES.fondoInput, marginBottom: 16,
  },
  botonLogin: {
    backgroundColor: COLORES.primario, borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: COLORES.textoBlanco, fontSize: 16, fontWeight: 'bold' },
  nota: {
    textAlign: 'center', fontSize: 12, color: COLORES.textoClaro,
    marginTop: 24, lineHeight: 18,
  },

  // ── Modal diagnóstico ──────────────────────────────────────────────────────
  modalFondo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCaja: {
    backgroundColor: COLORES.fondoTarjeta, borderRadius: 14,
    width: '100%', maxHeight: '85%', padding: 20,
  },
  modalTitulo: {
    fontSize: 16, fontWeight: 'bold', color: COLORES.primario,
    marginBottom: 16, textAlign: 'center',
  },
  diagCargando: { alignItems: 'center', paddingVertical: 30 },
  diagCargandoTexto: { marginTop: 12, color: COLORES.textoClaro, fontSize: 13 },
  diagScroll: { maxHeight: 340 },
  diagSeccion: {
    fontSize: 12, fontWeight: '700', color: COLORES.primario,
    marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottomWidth: 1, borderBottomColor: COLORES.borde, paddingBottom: 4,
  },
  diagEtiqueta: { fontSize: 12, color: COLORES.textoClaro, fontWeight: '600' },
  diagValor: { fontSize: 12, color: COLORES.texto, flexShrink: 1 },
  diagError: { fontSize: 12, color: COLORES.invalido, marginBottom: 3 },
  diagHora: { fontSize: 10, color: COLORES.textoMuyClaro, marginBottom: 4 },
  diagCuerpo: {
    backgroundColor: COLORES.fondo, padding: 8, borderRadius: 6,
    marginTop: 4, marginBottom: 4,
  },
  mono: { fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  diagBotones: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16,
  },
  botonReejecutar: {
    borderWidth: 1.5, borderColor: COLORES.primario, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  botonReejecutarTexto: { color: COLORES.primario, fontSize: 13, fontWeight: '600' },
  botonCerrarModal: {
    backgroundColor: COLORES.primario, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  botonCerrarModalTexto: { color: COLORES.textoBlanco, fontSize: 13, fontWeight: '600' },
});

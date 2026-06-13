import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { login } from '../services/autenticacion';

const COLORES = {
  primario: '#1B4332',
  secundario: '#2D6A4F',
  acento: '#52B788',
  fondo: '#F5F5F0',
  error: '#C0392B',
  texto: '#1A1A1A',
  textoClaro: '#6B7280',
};

export default function PantallaLogin({ navigation }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

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
                onPress: () => {
                  setNombreUsuario('');
                  setContrasena('');
                },
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

  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={estilos.scroll} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <View style={estilos.logoContenedor}>
            <Image
              source={require('../assets/logo.png')}
              style={estilos.logo}
              resizeMode="contain"
            />
          </View>
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
              <ActivityIndicator color="#FFFFFF" />
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
    </KeyboardAvoidingView>
  );
}

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
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  etiqueta: { fontSize: 13, fontWeight: '600', color: COLORES.texto, marginBottom: 6 },
  entrada: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    padding: 12, fontSize: 15, color: COLORES.texto,
    backgroundColor: '#FAFAFA', marginBottom: 16,
  },
  botonLogin: {
    backgroundColor: COLORES.primario, borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  nota: {
    textAlign: 'center', fontSize: 12, color: COLORES.textoClaro,
    marginTop: 24, lineHeight: 18,
  },
});

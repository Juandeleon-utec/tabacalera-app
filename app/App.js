import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { inicializarBaseDeDatos } from './services/baseDeDatos';
import { obtenerSesionActiva } from './services/autenticacion';
import COLORES from './constants/colores';

import PantallaLogin from './screens/PantallaLogin';
import PantallaAdmin from './screens/PantallaAdmin';
import PantallaInicio from './screens/PantallaInicio';
import PantallaEscaner from './screens/PantallaEscaner';
import PantallaEnvio from './screens/PantallaEnvio';
import PantallaHistorial from './screens/PantallaHistorial';

const Pila = createNativeStackNavigator();

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [rutaInicial, setRutaInicial] = useState('Login');

  useEffect(() => {
    async function inicializar() {
      try {
        await inicializarBaseDeDatos();
        const sesion = await obtenerSesionActiva();
        if (sesion) {
          setRutaInicial(sesion.rol === 'superadmin' ? 'Admin' : 'Inicio');
        }
      } catch (error) {
        console.error('Error al inicializar la app:', error);
      } finally {
        setCargando(false);
      }
    }
    inicializar();
  }, []);

  if (cargando) {
    return (
      <View style={estilos.contenedorCarga}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Pila.Navigator
        initialRouteName={rutaInicial}
        screenOptions={{
          headerStyle: { backgroundColor: COLORES.primario },
          headerTintColor: COLORES.textoBlanco,
          headerTitleStyle: { fontWeight: 'bold' },
          animation: 'slide_from_right',
        }}
      >
        <Pila.Screen
          name="Login"
          component={PantallaLogin}
          options={{ headerShown: false }}
        />
        <Pila.Screen
          name="Admin"
          component={PantallaAdmin}
          options={{ title: 'Panel Administrador', headerBackVisible: false }}
        />
        <Pila.Screen
          name="Inicio"
          component={PantallaInicio}
          options={{ title: 'Seleccionar Agricultor', headerBackVisible: false }}
        />
        <Pila.Screen
          name="Escaner"
          component={PantallaEscaner}
          options={{ title: 'Escanear Fardos' }}
        />
        <Pila.Screen
          name="Envio"
          component={PantallaEnvio}
          options={{ title: 'Detalle del Envío' }}
        />
        <Pila.Screen
          name="Historial"
          component={PantallaHistorial}
          options={{ title: 'Historial de Envíos' }}
        />
      </Pila.Navigator>
    </NavigationContainer>
  );
}

const estilos = StyleSheet.create({
  contenedorCarga: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.fondo,
  },
});

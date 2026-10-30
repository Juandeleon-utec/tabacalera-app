import React from 'react';
import { View, StyleSheet } from 'react-native';
import COLORES from '../constants/colores';

// Cuadrado de color de etiqueta. El borde gris hace visible el blanco.
export default function MuestraColor({ hex, tamaño = 18, style }) {
  return (
    <View
      style={[
        estilos.muestra,
        { width: tamaño, height: tamaño, backgroundColor: hex || 'transparent' },
        style,
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  muestra: {
    borderWidth: 1,
    borderColor: COLORES.bordeMuestraColor,
    borderRadius: 3,
  },
});

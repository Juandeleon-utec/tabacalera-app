import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORES from '../constants/colores';

export default function ItemFardo({ fardo, mostrarMotivo = false }) {
  const esValido = fardo.valido === 1 || fardo.valido === true;

  const hora = fardo.timestamp_escaneo
    ? new Date(fardo.timestamp_escaneo).toLocaleTimeString('es-UY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  return (
    <View style={[estilos.contenedor, esValido ? estilos.fondoValido : estilos.fondoInvalido]}>
      <View style={[estilos.indicador, { backgroundColor: esValido ? COLORES.valido : COLORES.invalido }]} />
      <View style={estilos.datos}>
        <Text style={estilos.codigo}>{fardo.codigo_qr}</Text>
        {mostrarMotivo && !esValido && fardo.motivo_invalido && (
          <Text style={estilos.motivo}>{fardo.motivo_invalido}</Text>
        )}
      </View>
      <View style={estilos.derecha}>
        <Text style={[estilos.estado, { color: esValido ? COLORES.valido : COLORES.invalido }]}>
          {esValido ? '✓' : '✗'}
        </Text>
        {hora ? <Text style={estilos.hora}>{hora}</Text> : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORES.borde,
  },
  fondoValido: { backgroundColor: COLORES.fondoValido },
  fondoInvalido: { backgroundColor: COLORES.fondoInvalido },
  indicador: { width: 4, height: '100%', borderRadius: 2, marginRight: 12, minHeight: 36 },
  datos: { flex: 1 },
  codigo: { fontSize: 14, fontFamily: 'monospace', color: COLORES.texto, letterSpacing: 0.5 },
  motivo: { fontSize: 11, color: COLORES.invalido, marginTop: 2 },
  derecha: { alignItems: 'flex-end' },
  estado: { fontSize: 18, fontWeight: 'bold' },
  hora: { fontSize: 10, color: COLORES.textoClaro, marginTop: 2 },
});

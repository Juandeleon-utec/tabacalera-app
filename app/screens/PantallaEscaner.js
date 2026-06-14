import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Vibration, FlatList, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { insertarFardo, listarFardosPorEnvio } from '../services/baseDeDatos';
import { validarCodigoQR, esCodigoQrConFormato } from '../services/validadorQR';
import ItemFardo from '../components/ItemFardo';
import COLORES from '../constants/colores';

const PANTALLA = Dimensions.get('window');

export default function PantallaEscaner({ navigation, route }) {
  const { envioId, idLocal, agricultor, sesion, fecha, hora, gps } = route.params;

  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(true);
  const [fardos, setFardos] = useState([]);
  const [ultimoEscaneo, setUltimoEscaneo] = useState(null);
  const [pausado, setPausado] = useState(false);
  const pausadoRef = useRef(false);

  useEffect(() => {
    cargarFardos();
  }, []);

  async function cargarFardos() {
    const lista = await listarFardosPorEnvio(envioId);
    setFardos(lista);
  }

  async function manejarQRescaneado({ data: codigoQr }) {
    if (pausadoRef.current) return;
    if (!esCodigoQrConFormato(codigoQr)) return; // Ignorar QRs que no son del sistema

    pausadoRef.current = true;
    setPausado(true);

    const codigosEnSesion = fardos.map((f) => f.codigo_qr);
    const resultado = await validarCodigoQR(codigoQr, agricultor.codigo_6dig, codigosEnSesion);

    // Feedback háptico diferenciado
    if (resultado.valido) {
      Vibration.vibrate(100);
    } else {
      Vibration.vibrate([0, 150, 50, 150]);
    }

    const nuevoFardoId = await insertarFardo({
      envio_id: envioId,
      codigo_qr: codigoQr,
      valido: resultado.valido,
      motivo_invalido: resultado.motivo || null,
    });

    const nuevoFardo = {
      id: nuevoFardoId,
      envio_id: envioId,
      codigo_qr: codigoQr,
      valido: resultado.valido ? 1 : 0,
      motivo_invalido: resultado.motivo || null,
      timestamp_escaneo: new Date().toISOString(),
    };

    setFardos((prev) => [nuevoFardo, ...prev]);
    setUltimoEscaneo({ codigo: codigoQr, valido: resultado.valido, motivo: resultado.motivo });

    // Reanudar escaneo después de 1.5 segundos
    setTimeout(() => {
      pausadoRef.current = false;
      setPausado(false);
    }, 1500);
  }

  function irACerrarEnvio() {
    const validos = fardos.filter((f) => f.valido === 1).length;
    if (validos === 0) {
      Alert.alert('Sin fardos válidos', 'No hay fardos válidos para cerrar el envío.');
      return;
    }
    navigation.navigate('Envio', { envioId, idLocal, agricultor, sesion, fecha, hora, gps });
  }

  if (!permiso) return <View style={estilos.contenedor} />;

  if (!permiso.granted) {
    return (
      <View style={[estilos.contenedor, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORES.textoBlanco, marginBottom: 20 }}>
          Se requiere acceso a la cámara
        </Text>
        <TouchableOpacity style={estilos.botonPermiso} onPress={solicitarPermiso}>
          <Text style={{ color: COLORES.textoBlanco }}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalValidos = fardos.filter((f) => f.valido === 1).length;
  const totalInvalidos = fardos.filter((f) => f.valido === 0).length;

  return (
    <View style={estilos.contenedor}>
      {/* Área de cámara */}
      <View style={estilos.camaraContenedor}>
        <CameraView
          style={estilos.camara}
          facing="back"
          onBarcodeScanned={pausado ? undefined : manejarQRescaneado}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39'] }}
        >
          {/* Marco de escaneo */}
          <View style={estilos.marcoOverlay}>
            <View style={estilos.marcoEscaneo}>
              <View style={[estilos.esquina, estilos.esquinaSuperiorIzq]} />
              <View style={[estilos.esquina, estilos.esquinaSuperiorDer]} />
              <View style={[estilos.esquina, estilos.esquinaInferiorIzq]} />
              <View style={[estilos.esquina, estilos.esquinaInferiorDer]} />
            </View>
          </View>

          {/* Agricultor info */}
          <View style={estilos.infoAgricultor}>
            <Text style={estilos.textoAgricultor}>{agricultor.nombre}</Text>
            <Text style={estilos.codigoAgricultor}>Código: {agricultor.codigo_6dig}</Text>
          </View>
        </CameraView>
      </View>

      {/* Feedback último escaneo */}
      {ultimoEscaneo && (
        <View style={[
          estilos.feedbackEscaneo,
          { backgroundColor: ultimoEscaneo.valido ? COLORES.valido : COLORES.invalido }
        ]}>
          <Text style={estilos.feedbackCodigo}>{ultimoEscaneo.codigo}</Text>
          <Text style={estilos.feedbackEstado}>
            {ultimoEscaneo.valido ? '✓ VÁLIDO' : `✗ ${ultimoEscaneo.motivo || 'INVÁLIDO'}`}
          </Text>
        </View>
      )}

      {/* Contador */}
      <View style={estilos.contadorBar}>
        <View style={estilos.contadorItem}>
          <Text style={[estilos.contadorNum, { color: COLORES.valido }]}>{totalValidos}</Text>
          <Text style={estilos.contadorLabel}>Válidos</Text>
        </View>
        <View style={estilos.contadorItem}>
          <Text style={[estilos.contadorNum, { color: COLORES.invalido }]}>{totalInvalidos}</Text>
          <Text style={estilos.contadorLabel}>Inválidos</Text>
        </View>
        <TouchableOpacity style={estilos.botonCerrar} onPress={irACerrarEnvio}>
          <Text style={estilos.textoBotonCerrar}>Cerrar envío</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de fardos escaneados */}
      <FlatList
        data={fardos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ItemFardo fardo={item} />}
        style={estilos.listaFardos}
        ListEmptyComponent={
          <Text style={estilos.textoVacio}>Escanee el primer fardo...</Text>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondoOscuro },
  camaraContenedor: { height: PANTALLA.height * 0.38 },
  camara: { flex: 1 },
  marcoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  marcoEscaneo: {
    width: 220, height: 220,
    backgroundColor: 'transparent',
  },
  esquina: {
    position: 'absolute', width: 30, height: 30,
    borderColor: COLORES.textoBlanco, borderWidth: 3,
  },
  esquinaSuperiorIzq: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  esquinaSuperiorDer: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  esquinaInferiorIzq: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  esquinaInferiorDer: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  infoAgricultor: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(27,67,50,0.85)', padding: 10,
  },
  textoAgricultor: { color: COLORES.textoBlanco, fontSize: 14, fontWeight: 'bold' },
  codigoAgricultor: { color: COLORES.sobrePrimario, fontSize: 12 },
  feedbackEscaneo: {
    padding: 10, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  feedbackCodigo: { color: COLORES.textoBlanco, fontFamily: 'monospace', fontSize: 13 },
  feedbackEstado: { color: COLORES.textoBlanco, fontWeight: 'bold', fontSize: 13 },
  contadorBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORES.fondoTarjeta, padding: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: COLORES.borde,
  },
  contadorItem: { alignItems: 'center', marginRight: 20 },
  contadorNum: { fontSize: 22, fontWeight: 'bold' },
  contadorLabel: { fontSize: 11, color: COLORES.textoClaro },
  botonCerrar: {
    marginLeft: 'auto', backgroundColor: COLORES.primario,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  textoBotonCerrar: { color: COLORES.textoBlanco, fontWeight: 'bold', fontSize: 14 },
  listaFardos: { flex: 1, backgroundColor: COLORES.fondoTarjeta },
  textoVacio: {
    textAlign: 'center', color: COLORES.textoMuyClaro, padding: 30, fontSize: 14,
  },
  botonPermiso: {
    backgroundColor: COLORES.primario, padding: 14, borderRadius: 8,
  },
});

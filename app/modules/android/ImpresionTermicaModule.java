package com.montepaz.tabacalera;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;

public class ImpresionTermicaModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "ImpresionTermica";
    private static final String[] PUERTOS = {"/dev/ttyS1", "/dev/ttyS2"};
    private static final int ANCHO = 32;

    // ESC/POS byte sequences
    private static final byte[] INIT      = {0x1B, 0x40};
    private static final byte[] BOLD_ON   = {0x1B, 0x45, 0x01};
    private static final byte[] BOLD_OFF  = {0x1B, 0x45, 0x00};
    private static final byte[] CENTER    = {0x1B, 0x61, 0x01};
    private static final byte[] LEFT      = {0x1B, 0x61, 0x00};
    private static final byte[] CUT       = {0x1D, 0x56, 0x00};
    private static final byte   LF        = 0x0A;

    public ImpresionTermicaModule(ReactApplicationContext ctx) {
        super(ctx);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void verificarDisponible(Promise promise) {
        for (String puerto : PUERTOS) {
            if (new File(puerto).exists()) {
                promise.resolve(true);
                return;
            }
        }
        promise.resolve(false);
    }

    @ReactMethod
    public void imprimirTicket(ReadableMap datos, Promise promise) {
        try {
            byte[] ticket = construirTicket(datos);
            escribirPuerto(ticket, promise);
        } catch (Exception e) {
            promise.reject("IMPRESORA_ERROR", e.getMessage(), e);
        }
    }

    private byte[] construirTicket(ReadableMap d) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        String agricultor = transliterar(getString(d, "agricultor"));
        String codigo     = getString(d, "codigo");
        String fecha      = getString(d, "fecha");
        String hora       = getString(d, "hora");
        String operador   = transliterar(getString(d, "operador"));
        int totalValidos     = getInt(d, "totalValidos");
        int totalInvalidos   = getInt(d, "totalInvalidos");
        int totalDuplicados  = getInt(d, "totalDuplicados");
        int totalFardos      = totalValidos + totalInvalidos;
        ReadableArray qrList = d.hasKey("fardosValidos") ? d.getArray("fardosValidos") : null;

        // ── Cabecera ────────────────────────────────────────────────
        out.write(INIT);
        out.write(CENTER);
        out.write(BOLD_ON);
        escribe(out, "MONTEPAZ - Desde 1880");
        out.write(LF);
        out.write(BOLD_OFF);
        escribe(out, sep());
        out.write(LF);

        // ── Datos del envío ─────────────────────────────────────────
        out.write(LEFT);
        escribeLinea(out, "Agricultor:", recortar(agricultor, 19));
        escribeLinea(out, "Codigo:    ", codigo);
        escribeLinea(out, "Fecha:     ", fecha);
        escribeLinea(out, "Hora:      ", hora);
        escribeLinea(out, "Operador:  ", recortar(operador, 20));
        escribe(out, sep());
        out.write(LF);

        // ── Lista de fardos válidos ─────────────────────────────────
        out.write(BOLD_ON);
        escribe(out, "FARDOS VALIDOS");
        out.write(LF);
        out.write(BOLD_OFF);

        if (qrList != null) {
            for (int i = 0; i < qrList.size(); i++) {
                escribe(out, qrList.getString(i) + " .... OK");
                out.write(LF);
            }
        }

        escribe(out, sep());
        out.write(LF);

        // ── Totales ─────────────────────────────────────────────────
        escribeLinea(out, "Validos:   ", String.valueOf(totalValidos));
        escribeLinea(out, "Invalidos: ", String.valueOf(totalInvalidos));
        escribeLinea(out, "Duplicados:", String.valueOf(totalDuplicados));
        escribeLinea(out, "Total:     ", String.valueOf(totalFardos));
        escribe(out, sep());
        out.write(LF);

        // ── Pie ─────────────────────────────────────────────────────
        out.write(CENTER);
        escribe(out, "Firmado digitalmente en app");
        out.write(LF);
        escribe(out, "Tabacalera Montepaz v1.0");
        out.write(LF);
        escribe(out, sep());
        out.write(LF);

        // Avance de papel y corte
        out.write(new byte[]{LF, LF, LF});
        out.write(CUT);

        return out.toByteArray();
    }

    private void escribe(ByteArrayOutputStream out, String texto) throws IOException {
        out.write(texto.getBytes(Charset.forName("GBK")));
    }

    private void escribeLinea(ByteArrayOutputStream out, String label, String valor) throws IOException {
        escribe(out, label + " " + valor);
        out.write(LF);
    }

    private String sep() {
        // 32 caracteres exactos
        return "================================";
    }

    private String recortar(String texto, int max) {
        if (texto == null) return "";
        if (texto.length() <= max) return texto;
        return texto.substring(0, max - 3) + "...";
    }

    private String transliterar(String texto) {
        if (texto == null) return "";
        return texto
            .replace("á", "a").replace("Á", "A")
            .replace("é", "e").replace("É", "E")
            .replace("í", "i").replace("Í", "I")
            .replace("ó", "o").replace("Ó", "O")
            .replace("ú", "u").replace("Ú", "U")
            .replace("ñ", "n").replace("Ñ", "N")
            .replace("ü", "u").replace("Ü", "U");
    }

    private String getString(ReadableMap map, String key) {
        return map.hasKey(key) && !map.isNull(key) ? map.getString(key) : "";
    }

    private int getInt(ReadableMap map, String key) {
        return map.hasKey(key) && !map.isNull(key) ? map.getInt(key) : 0;
    }

    private void escribirPuerto(byte[] datos, Promise promise) {
        for (String puerto : PUERTOS) {
            File f = new File(puerto);
            if (!f.exists()) continue;
            try (FileOutputStream fos = new FileOutputStream(f)) {
                fos.write(datos);
                fos.flush();
                promise.resolve(puerto);
                return;
            } catch (IOException e) {
                // Intentar siguiente puerto
            }
        }
        promise.reject("IMPRESORA_NO_DISPONIBLE",
            "No se pudo escribir en /dev/ttyS1 ni /dev/ttyS2");
    }
}

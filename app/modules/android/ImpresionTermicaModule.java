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

    // Puertos por defecto (fallback si JS no pasa la lista)
    private static final String[] PUERTOS_DEFAULT = {
        "/dev/ttyS1", "/dev/ttyS2", "/dev/ttyS3", "/dev/ttyS4", "/dev/ttyS5"
    };

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

    // Verifica disponibilidad usando los puertos por defecto (compatibilidad hacia atrás)
    @ReactMethod
    public void verificarDisponible(Promise promise) {
        verificarEnArray(PUERTOS_DEFAULT, promise);
    }

    // Verifica disponibilidad usando los puertos pasados desde JS (config.js)
    @ReactMethod
    public void verificarEnPuertos(ReadableArray puertosArr, Promise promise) {
        String[] puertos = arrayDesdeReadable(puertosArr, PUERTOS_DEFAULT);
        verificarEnArray(puertos, promise);
    }

    @ReactMethod
    public void imprimirTicket(ReadableMap datos, Promise promise) {
        try {
            // Lee puertos desde datos si JS los pasó; si no, usa defaults
            String[] puertos = PUERTOS_DEFAULT;
            if (datos.hasKey("puertos") && !datos.isNull("puertos")) {
                ReadableArray arr = datos.getArray("puertos");
                if (arr != null && arr.size() > 0) {
                    puertos = arrayDesdeReadable(arr, PUERTOS_DEFAULT);
                }
            }
            byte[] ticket = construirTicket(datos);
            escribirPuerto(ticket, puertos, promise);
        } catch (Exception e) {
            promise.reject("IMPRESORA_ERROR", e.getMessage(), e);
        }
    }

    // ── Helpers internos ──────────────────────────────────────────────────────

    private void verificarEnArray(String[] puertos, Promise promise) {
        for (String puerto : puertos) {
            if (new File(puerto).exists()) {
                promise.resolve(true);
                return;
            }
        }
        promise.resolve(false);
    }

    private String[] arrayDesdeReadable(ReadableArray arr, String[] fallback) {
        if (arr == null || arr.size() == 0) return fallback;
        String[] resultado = new String[arr.size()];
        for (int i = 0; i < arr.size(); i++) {
            resultado[i] = arr.getString(i);
        }
        return resultado;
    }

    private byte[] construirTicket(ReadableMap d) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        String agricultor = transliterar(getString(d, "agricultor"));
        String codigo     = getString(d, "codigo");
        String empresa    = transliterar(getString(d, "empresa"));
        String chofer     = transliterar(getString(d, "chofer"));
        String matricula  = getString(d, "matricula");
        String colorEtiq  = transliterar(getString(d, "colorEtiqueta"));
        String fecha      = getString(d, "fecha");
        String hora       = getString(d, "hora");
        String operador   = transliterar(getString(d, "operador"));
        int totalValidos  = getInt(d, "totalValidos");
        ReadableArray qrList = d.hasKey("fardosValidos") ? d.getArray("fardosValidos") : null;

        // ── Cabecera ────────────────────────────────────────────────
        out.write(INIT);
        out.write(CENTER);
        out.write(BOLD_ON);
        escribe(out, "MONTEPAZ - Rivera-Artigas");
        out.write(LF);
        out.write(BOLD_OFF);
        escribe(out, sep());
        out.write(LF);

        // ── Agricultor ──────────────────────────────────────────────
        out.write(LEFT);
        escribeLinea(out, "Agricultor:", recortar(agricultor, 19));
        escribeLinea(out, "Codigo:    ", codigo);
        if (!colorEtiq.isEmpty()) {
            escribeLinea(out, "Etiqueta:  ", recortar(colorEtiq, 20));
        }
        escribe(out, subSep());
        out.write(LF);

        // ── Transporte ──────────────────────────────────────────────
        if (!empresa.isEmpty()) {
            escribeLinea(out, "Empresa:   ", recortar(empresa, 20));
        }
        if (!chofer.isEmpty()) {
            escribeLinea(out, "Chofer:    ", recortar(chofer, 20));
        }
        if (!matricula.isEmpty()) {
            escribeLinea(out, "Matricula: ", matricula);
        }
        escribe(out, subSep());
        out.write(LF);

        // ── Fecha / Hora / Operador ─────────────────────────────────
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

        // ── Total válidos ───────────────────────────────────────────
        out.write(BOLD_ON);
        escribeLinea(out, "Total validos:", String.valueOf(totalValidos));
        out.write(BOLD_OFF);
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
        return "================================";
    }

    private String subSep() {
        return "--------------------------------";
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

    private void escribirPuerto(byte[] datos, String[] puertos, Promise promise) {
        StringBuilder intentados = new StringBuilder();
        for (String puerto : puertos) {
            File f = new File(puerto);
            if (!f.exists()) continue;
            try (FileOutputStream fos = new FileOutputStream(f)) {
                fos.write(datos);
                fos.flush();
                promise.resolve(puerto);
                return;
            } catch (IOException e) {
                intentados.append(puerto).append(" ");
            }
        }
        promise.reject("IMPRESORA_NO_DISPONIBLE",
            "No se encontró ningún puerto disponible. Intentados: " + intentados.toString().trim());
    }
}

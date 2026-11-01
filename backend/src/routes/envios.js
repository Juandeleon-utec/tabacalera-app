const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { Envio, Fardo, Usuario, Agricultor } = require('../models');
const { sequelize } = require('../models');
const { normalizarHex } = require('../models/ColorEtiqueta');

/**
 * POST /api/envios/sync
 * Recibe un array de envíos cerrados desde la app.
 * Requiere JWT de sincronización.
 */
router.post('/sync', verificarToken, async (req, res) => {
  const { envios } = req.body;

  if (!Array.isArray(envios) || envios.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de envíos' });
  }

  const resultados = [];
  const transaccion = await sequelize.transaction();

  try {
    for (const envioData of envios) {
      const {
        id_local,
        usuario_id,
        agricultor_id,
        transportista_id,
        documento_chofer_real,
        observaciones,
        // Color de etiqueta: opcional, APKs anteriores a 1.3.0 no lo envían
        color_etiqueta_id,
        color_etiqueta_nombre,
        color_etiqueta_hex,
        fecha,
        hora,
        gps_lat,
        gps_lng,
        // v1.4.0 — opcionales, APKs anteriores no los envían
        nro_remito,
        terminal_codigo,
        hora_inicio_carga,
        hora_fin_carga,
        fardos = [],
      } = envioData;

      // Evitar duplicados por id_local
      const existente = await Envio.findOne({ where: { id_local }, transaction: transaccion });
      if (existente) {
        resultados.push({ id_local, estado: 'duplicado', id_servidor: existente.id });
        continue;
      }

      // Un remito repetido con otro id_local no debería ocurrir nunca: no se
      // guarda (la app lo reintenta) y queda en el log para investigarlo.
      if (nro_remito) {
        const conflicto = await Envio.findOne({ where: { nro_remito }, transaction: transaccion });
        if (conflicto) {
          console.error(`[ENVIOS SYNC] Remito ${nro_remito} duplicado: id_local ${id_local} vs envío ${conflicto.id}`);
          resultados.push({ id_local, estado: 'remito_duplicado', id_servidor: null });
          continue;
        }
      }

      const envio = await Envio.create(
        {
          id_local,
          usuario_id,
          agricultor_id,
          transportista_id: transportista_id || null,
          documento_chofer_real: documento_chofer_real || null,
          observaciones: observaciones || null,
          color_etiqueta_id: color_etiqueta_id || null,
          color_etiqueta_nombre: color_etiqueta_nombre || null,
          color_etiqueta_hex: normalizarHex(color_etiqueta_hex),
          fecha,
          hora,
          gps_lat: gps_lat || null,
          gps_lng: gps_lng || null,
          nro_remito: nro_remito || null,
          terminal_codigo: terminal_codigo || null,
          hora_inicio_carga: hora_inicio_carga || null,
          hora_fin_carga: hora_fin_carga || null,
          total_fardos: fardos.length,
          sincronizado_at: new Date(),
        },
        { transaction: transaccion }
      );

      if (fardos.length > 0) {
        const fardosParaCrear = fardos.map((f) => ({
          envio_id: envio.id,
          codigo_qr: f.codigo_qr,
          valido: f.valido,
          motivo_invalido: f.motivo_invalido || null,
          timestamp_escaneo: f.timestamp_escaneo,
        }));
        await Fardo.bulkCreate(fardosParaCrear, { transaction: transaccion });
      }

      resultados.push({ id_local, estado: 'creado', id_servidor: envio.id });
    }

    await transaccion.commit();
    res.json({ ok: true, resultados });
  } catch (error) {
    await transaccion.rollback();
    console.error('[ENVIOS SYNC]', error);
    res.status(500).json({ error: 'Error al sincronizar envíos' });
  }
});

/**
 * GET /api/envios
 * Lista todos los envíos con información básica.
 * Requiere JWT.
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    const { pagina = 1, por_pagina = 50, agricultor_id, usuario_id } = req.query;

    const where = {};
    if (agricultor_id) where.agricultor_id = agricultor_id;
    if (usuario_id) where.usuario_id = usuario_id;

    const offset = (parseInt(pagina) - 1) * parseInt(por_pagina);

    const { count, rows } = await Envio.findAndCountAll({
      where,
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'usuario'] },
        { model: Agricultor, as: 'agricultor', attributes: ['codigo_6dig', 'nombre'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(por_pagina),
      offset,
    });

    res.json({
      ok: true,
      total: count,
      pagina: parseInt(pagina),
      por_pagina: parseInt(por_pagina),
      envios: rows.map((e) => e.toJSON()),
    });
  } catch (error) {
    console.error('[ENVIOS GET]', error);
    res.status(500).json({ error: 'Error al obtener envíos' });
  }
});

/**
 * GET /api/envios/:id
 * Detalle de un envío con sus fardos.
 * Requiere JWT.
 */
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const envio = await Envio.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'usuario'] },
        { model: Agricultor, as: 'agricultor', attributes: ['codigo_6dig', 'nombre', 'direccion'] },
        { model: Fardo, as: 'fardos', order: [['timestamp_escaneo', 'ASC']] },
      ],
    });

    if (!envio) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json({ ok: true, envio: envio.toJSON() });
  } catch (error) {
    console.error('[ENVIO DETALLE]', error);
    res.status(500).json({ error: 'Error al obtener el envío' });
  }
});

module.exports = router;

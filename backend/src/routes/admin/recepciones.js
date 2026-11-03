const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const {
  sequelize, Envio, Fardo, Usuario, Agricultor, Transportista, Terminal,
} = require('../../models');
const { generarHtmlRemito } = require('../../services/remitoHtml');

/**
 * Histórico de recepciones (envíos sincronizados desde las terminales) y
 * reimpresión del remito. Solo lectura: las recepciones no se editan desde
 * el panel.
 */

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Cantidad de fardos válidos sin traer los fardos al listado
const ATRIB_FARDOS_VALIDOS = [
  sequelize.literal('(SELECT COUNT(*) FROM fardos f WHERE f.envio_id = `Envio`.`id` AND f.valido = 1)'),
  'fardos_validos',
];

const INCLUDES_BASE = [
  { model: Agricultor, as: 'agricultor', attributes: ['id', 'codigo_6dig', 'nombre'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'usuario'] },
  { model: Transportista, as: 'transportista', attributes: ['id', 'empresa', 'nombre_chofer', 'matricula'] },
];

/**
 * GET /api/admin/recepciones/opciones
 * Valores para los desplegables de filtros.
 */
router.get('/recepciones/opciones', async (req, res) => {
  try {
    const [usuarios, terminales] = await Promise.all([
      Usuario.findAll({ attributes: ['id', 'nombre', 'usuario'], order: [['nombre', 'ASC']] }),
      Terminal.findAll({ attributes: ['codigo', 'alias'], order: [['codigo', 'ASC']] }),
    ]);
    res.json({ ok: true, usuarios, terminales });
  } catch (error) {
    console.error('Error al obtener opciones de recepciones:', error);
    res.status(500).json({ error: 'Error al obtener opciones' });
  }
});

/**
 * GET /api/admin/recepciones
 * Filtros (todos opcionales): desde, hasta (YYYY-MM-DD, por fecha del envío),
 * agricultor (código o parte del nombre), usuario_id, terminal (código de 3
 * dígitos), remito (parte del N°). Paginado: pagina, por_pagina (máx. 200).
 */
router.get('/recepciones', async (req, res) => {
  try {
    const { desde, hasta, agricultor, usuario_id, terminal, remito } = req.query;
    const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
    const porPagina = Math.min(Math.max(parseInt(req.query.por_pagina, 10) || 50, 1), 200);

    const where = {};
    if (desde || hasta) {
      if ((desde && !REGEX_FECHA.test(desde)) || (hasta && !REGEX_FECHA.test(hasta))) {
        return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' });
      }
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = desde;
      if (hasta) where.fecha[Op.lte] = hasta;
    }
    if (usuario_id) where.usuario_id = parseInt(usuario_id, 10) || 0;
    if (terminal) where.terminal_codigo = String(terminal).trim();
    if (remito) where.nro_remito = { [Op.like]: `%${String(remito).trim()}%` };
    if (agricultor) {
      const texto = `%${String(agricultor).trim()}%`;
      where[Op.or] = [
        { '$agricultor.codigo_6dig$': { [Op.like]: texto } },
        { '$agricultor.nombre$': { [Op.like]: texto } },
      ];
    }

    const { count, rows } = await Envio.findAndCountAll({
      where,
      attributes: {
        include: [ATRIB_FARDOS_VALIDOS],
        exclude: ['gps_lat', 'gps_lng', 'id_local'],
      },
      include: INCLUDES_BASE,
      order: [['fecha', 'DESC'], ['hora', 'DESC'], ['id', 'DESC']],
      limit: porPagina,
      offset: (pagina - 1) * porPagina,
      subQuery: false,
    });

    res.json({
      ok: true,
      total: count,
      pagina,
      por_pagina: porPagina,
      recepciones: rows.map((e) => {
        const j = e.toJSON();
        j.fardos_validos = Number(j.fardos_validos || 0);
        return j;
      }),
    });
  } catch (error) {
    console.error('Error al obtener recepciones:', error);
    res.status(500).json({ error: 'Error al obtener recepciones' });
  }
});

async function buscarRecepcionCompleta(id) {
  return Envio.findByPk(id, {
    include: [
      ...INCLUDES_BASE,
      { model: Fardo, as: 'fardos' },
    ],
    order: [[{ model: Fardo, as: 'fardos' }, 'timestamp_escaneo', 'ASC']],
  });
}

/**
 * GET /api/admin/recepciones/:id
 * Detalle con todos los fardos (válidos, inválidos y duplicados).
 */
router.get('/recepciones/:id', async (req, res) => {
  try {
    const envio = await buscarRecepcionCompleta(req.params.id);
    if (!envio) {
      return res.status(404).json({ error: 'Recepción no encontrada' });
    }
    res.json({ ok: true, recepcion: envio.toJSON() });
  } catch (error) {
    console.error('Error al obtener recepción:', error);
    res.status(500).json({ error: 'Error al obtener la recepción' });
  }
});

/**
 * GET /api/admin/recepciones/:id/remito
 * Remito en HTML para imprimir o guardar como PDF desde el navegador.
 */
router.get('/recepciones/:id/remito', async (req, res) => {
  try {
    const envio = await buscarRecepcionCompleta(req.params.id);
    if (!envio) {
      return res.status(404).send('Recepción no encontrada');
    }
    console.log(`[REMITO] Reimpresión envío ${envio.id} (${envio.nro_remito || 'sin remito'}) por ${req.session?.admin?.usuario || 'admin'}`);
    res.type('html').send(generarHtmlRemito(envio.toJSON()));
  } catch (error) {
    console.error('Error al generar remito:', error);
    res.status(500).send('Error al generar el remito');
  }
});

module.exports = router;

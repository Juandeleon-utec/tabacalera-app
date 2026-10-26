const { ColorEtiqueta, Envio } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const colores = await ColorEtiqueta.findAll({ where: { activo: true });
    res.json({ ok: true, colores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener colores' });
  }
};

exports.getById = async (req, res) => {
  try {
    const color = await ColorEtiqueta.findByPk(req.params.id);
    if (!color) return res.status(404).json({ error: 'Color no encontrado' });
    res.json({ ok: true, color });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el color' });
  }
};

exports.create = async (req, res) => {
  try {
    let { nombre, hex } = req.body;
    
    if (hex) {
      if (!hex.startsWith('#')) {
        hex = `#${hex}`;
      }
      hex = hex.toUpperCase();
    }

    const nuevoColor = await ColorEtiqueta.create({ nombre, hex });
    res.status(201).json({ ok: true, color: nuevoColor });
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El nombre ya está en uso' });
    }
    res.status(500).json({ error: 'Error al crear el color' });
  }
};

exports.update = async (req, res) => {
  try {
    const { nombre, hex } = req.body;
    const id = req.params.id;
    
    let updatedData = { nombre };
    
    if (hex) {
      if (!hex.startsWith('#')) {
        hex = `#${hex}`;
      }
      updatedData.hex = hex.toUpperCase();
    }

    const color = await ColorEtiqueta.findByPk(id);
    if (!color) return res.status(404).json({ error: 'Color no encontrado' });

    await color.update(updatedData);
    res.json({ ok: true, color });
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El nombre ya está en uso' });
    }
    res.status(500).json({ error: 'Error al actualizar el color' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const color = await ColorEtiqueta.findByPk(id);
    
    if (!color) return res.status(404).json({ error: 'Color no encontrado' });

    // Verificar si está siendo usado en envios
    const enviosAsociados = await Envio.count({ where: { color_etiqueta_id: id } });
    if (enviosAsociados > 0) {
      return res.status(400).json({ error: `El color tiene ${enviosAsociados} compras asociadas y no puede eliminarse. Ofrezca desactivarlo.` });
    }

    await color.destroy();
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el color' });
  }
};

exports.toggleStatus = async (req, res) => {
    try {
      const id = req.params.id;
      const color = await ColorEtiqueta.findByPk(id);
      if (!color) return res.status(404).json({ error: 'Color no encontrado' });
      
      await color.update({ activo: !color.activo });
      res.json({ ok: true, color });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al cambiar estado' });
    }
  };

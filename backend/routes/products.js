import express from 'express';
import pool from '../models/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ✅ POST /api/products — Добавление товара
router.post('/', async (req, res) => {
  const {
    title_ru,
    title_uz,
    description,
    category_id,
    subcategory_id,
    width,
    density,
    dye,
    composition,
    colors,
    img,
    images,
  } = req.body;

  try {
    const id = uuidv4();

    await pool.query(
      `INSERT INTO products (
        id, title_ru, title_uz, description, category_id, subcategory_id,
        width, density, dye, composition, colors, img, images
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13
      )`,
      [
        id,
        title_ru,
        title_uz,
        description,
        category_id,
        subcategory_id || null,
        width,
        density,
        dye,
        composition,
        colors,
        img,
        images,
      ]
    );

    res.status(201).json({ message: 'Товар успешно добавлен', id });
  } catch (err) {
    console.error('❌ Ошибка добавления товара:', err);
    res.status(500).json({ message: 'Ошибка сервера при добавлении товара' });
  }
});

router.get('/', async (req, res) => {
  const {
    page = 1,
    category = '',
    subcategory = '',
    search = '',
    lang = 'ru',
    limit = 12
  } = req.query;

  const offset = (page - 1) * limit;
  const values = [];
  let where = 'WHERE 1=1';

  if (category) {
    values.push(category);
    where += ` AND category_id = $${values.length}`;
  }

  if (subcategory) {
    values.push(subcategory);
    where += ` AND subcategory_id = $${values.length}`;
  }

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    where += ` AND LOWER(${lang === 'ru' ? 'title_ru' : 'title_uz'}) LIKE $${values.length}`;
  }

  try {
    const total = await pool.query(`SELECT COUNT(*) FROM products ${where}`, values);
    const result = await pool.query(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    res.json({
      products: result.rows,
      total: Number(total.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('❌ Ошибка загрузки продуктов:', err);
    res.status(500).json({ message: 'Ошибка загрузки товаров' });
  }
});


export default router;

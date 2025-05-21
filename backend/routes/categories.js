import express from 'express';
import pool from '../models/db.js';

const router = express.Router();

// ✅ GET /api/categories?lang=all|ru|uz
router.get('/', async (req, res) => {
  const lang = req.query.lang || 'ru';

  try {
    const result = await pool.query(`
      SELECT 
        c.id AS category_id,
        c.name AS category_name,
        c.lang,
        json_agg(
          json_build_object(
            'id', s.id,
            'name', CASE 
              WHEN $1 = 'ru' THEN s.name_ru 
              ELSE s.name_uz 
            END,
            'product_count', (
              SELECT COUNT(*) FROM products p WHERE p.subcategory_id = s.id
            )
          )
        ) FILTER (WHERE s.id IS NOT NULL) AS subcategories
      FROM categories c
      LEFT JOIN subcategories s ON s.category_id = c.id
      WHERE c.lang = $1
      GROUP BY c.id, c.name, c.lang
      ORDER BY MAX(c.created_at) DESC;
    `, [lang]);

    const categories = result.rows.map(row => ({
      id: row.category_id,
      name: row.category_name,
      lang: row.lang,
      subcategories: row.subcategories || [],
    }));

    res.json({ categories });
  } catch (err) {
    console.error('❌ SQL Ошибка:', err);
    res.status(500).json({ message: 'Ошибка при получении категорий' });
  }
});
router.post('/dual', async (req, res) => {
  const { ru, uz } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO categories (id, name, lang) VALUES (gen_random_uuid(), $1, $2) RETURNING id',
      [ru.name, 'ru']
    );
    const categoryId = result.rows[0].id;

    // Добавляем узбекскую версию категории
    await pool.query(
      'INSERT INTO categories (id, name, lang) VALUES ($1, $2, $3)',
      [categoryId, uz.name, 'uz']
    );

    // Подкатегории (одна на оба языка)
    for (let i = 0; i < ru.subcategories.length; i++) {
      await pool.query(
        'INSERT INTO subcategories (name_ru, name_uz, category_id) VALUES ($1, $2, $3)',
        [ru.subcategories[i], uz.subcategories[i] || '', categoryId]
      );
    }

    res.status(201).json({ message: 'Категория добавлена на двух языках' });
  } catch (err) {
    console.error('❌ POST dual error:', err);
    res.status(500).json({ message: 'Ошибка при добавлении категории' });
  }
});

  
// ✅ POST /api/categories
router.post('/', async (req, res) => {
  const { name, lang, subcategories } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO categories (id, name, lang) VALUES ($1, $2, $3)',
      [categoryId, uz.name, 'uz']
    );
    
    // ❗ Обязательно:
    for (const sub of uz.subcategories) {
      await pool.query(
        'INSERT INTO subcategories (name, lang, category_id) VALUES ($1, $2, $3)',
        [sub, 'uz', categoryId]
      );
    }

    res.status(201).json({ message: 'Категория добавлена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при добавлении категории' });
  }
});

// ✅ PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  const { ru, uz } = req.body;
  const { id } = req.params;

  try {
    await pool.query('UPDATE categories SET name = $1 WHERE id = $2 AND lang = $3', [ru.name, id, 'ru']);
    await pool.query('UPDATE categories SET name = $1 WHERE id = $2 AND lang = $3', [uz.name, id, 'uz']);

    // Удаляем старые подкатегории
    await pool.query('DELETE FROM subcategories WHERE category_id = $1', [id]);

    // Добавляем новые
    for (let i = 0; i < ru.subcategories.length; i++) {
      await pool.query(
        'INSERT INTO subcategories (name_ru, name_uz, category_id) VALUES ($1, $2, $3)',
        [ru.subcategories[i], uz.subcategories[i] || '', id]
      );
    }

    res.json({ message: 'Категория обновлена' });
  } catch (err) {
    console.error('❌ PUT dual error:', err);
    res.status(500).json({ message: 'Ошибка при обновлении' });
  }
});


// ✅ DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ message: 'Категория удалена' });
  } catch (err) {
    console.error('❌ DELETE error:', err);
    res.status(500).json({ message: 'Ошибка при удалении' });
  }
});



export default router;

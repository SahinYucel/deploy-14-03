const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Promise wrapper for database queries
  const query = (sql, values) => {
    return new Promise((resolve, reject) => {
      db.query(sql, values, (error, results) => {
        if (error) {
          console.error('Database query error:', error);
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  };

  // Kasaları getir
  router.get('/:companyId', async (req, res) => {
    const { companyId } = req.params;

    try {
      const sql = `
        SELECT * FROM safe 
        WHERE company_id = ?
        ORDER BY created_at DESC
      `;
      
      const safes = await query(sql, [companyId]);
      res.json(safes);

    } catch (error) {
      console.error('Kasa getirme hatası:', error);
      res.status(500).json({ 
        error: 'Kasalar getirilemedi',
        details: error.message 
      });
    }
  });

  // Kasa kaydet/güncelle
  router.post('/save', async (req, res) => {
    const { companyId, safe } = req.body;

    try {
      if (safe.id) {
        // Güncelleme
        const updateSql = `
          UPDATE safe 
          SET name = ?, 
              type = ?,
              pos_commission_rate = ?,
              balance = ?
          WHERE id = ? AND company_id = ?
        `;

        await query(updateSql, [
          safe.name,
          safe.type,
          safe.type === 'pos' ? safe.pos_commission_rate : null,
          safe.balance,
          safe.id,
          companyId
        ]);

      } else {
        // Yeni kayıt
        const insertSql = `
          INSERT INTO safe (
            company_id, name, type, pos_commission_rate, balance
          ) VALUES (?, ?, ?, ?, ?)
        `;

        await query(insertSql, [
          companyId,
          safe.name,
          safe.type,
          safe.type === 'pos' ? safe.pos_commission_rate : null,
          safe.balance
        ]);
      }

      res.json({ 
        success: true, 
        message: 'Kasa başarıyla kaydedildi' 
      });

    } catch (error) {
      console.error('Kasa kaydetme hatası:', error);
      res.status(500).json({ 
        error: 'Kasa kaydedilemedi',
        details: error.message 
      });
    }
  });

  // Kasa sil
  router.delete('/:safeId', async (req, res) => {
    const { safeId } = req.params;

    try {
      await query('DELETE FROM safe WHERE id = ?', [safeId]);
      res.json({ 
        success: true, 
        message: 'Kasa başarıyla silindi' 
      });

    } catch (error) {
      console.error('Kasa silme hatası:', error);
      res.status(500).json({ 
        error: 'Kasa silinemedi',
        details: error.message 
      });
    }
  });

  return router;
}; 
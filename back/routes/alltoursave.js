const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.post('/save', async (req, res) => {
    const connection = await db.promise();
    
    try {
      await connection.beginTransaction();

      console.log('API\'ye gelen ham veriler:', JSON.stringify(req.body, null, 2));

      // Veri kontrolü
      if (!Array.isArray(req.body) || req.body.length === 0) {
        throw new Error('Geçerli tur verisi bulunamadı');
      }

      const companyRef = req.body[0]?.mainTour?.company_ref;
      if (!companyRef) {
        throw new Error('Company reference is required');
      }

      // Önce mevcut tüm verileri temizle
      console.log('Mevcut verileri temizleme başlıyor...');
      
      // İlişkili tabloları temizle (sıralama önemli - foreign key constraints için)
      await connection.query('DELETE FROM tour_options WHERE tour_id IN (SELECT id FROM tours WHERE company_ref = ?)', [companyRef]);
      await connection.query('DELETE FROM tour_pickup_times WHERE tour_id IN (SELECT id FROM tours WHERE company_ref = ?)', [companyRef]);
      await connection.query('DELETE FROM tour_days WHERE tour_id IN (SELECT id FROM tours WHERE company_ref = ?)', [companyRef]);
      await connection.query('DELETE FROM tour_regions WHERE tour_id IN (SELECT id FROM tours WHERE company_ref = ?)', [companyRef]);
      
      // Ana tabloyu temizle
      await connection.query('DELETE FROM tours WHERE company_ref = ?', [companyRef]);
      
      console.log('Mevcut veriler temizlendi');

      // Ana turları topla
      const anaTurlar = new Set();
      const anaTurIds = new Map(); // tour_name -> id eşleştirmesi için

      // Önce ana turları topla
      for (const tourData of req.body) {
        const { mainTour } = tourData;
        console.log('Gelen tur verisi:', {
          tour_name: mainTour.tour_name,
          main_tour_name: mainTour.main_tour_name,
          full_data: mainTour
        });
        if (mainTour.main_tour_name) {
          anaTurlar.add(mainTour.main_tour_name);
        }
      }

      // Mevcut ana turları getir
      const [existingMainTours] = await connection.query(
        'SELECT id, tour_name FROM main_tours WHERE company_ref = ?',
        [companyRef]
      );

      console.log('Mevcut ana turlar:', existingMainTours);

      // Mevcut ana turları map'e ekle
      existingMainTours.forEach(tour => {
        console.log('Ana tur map\'e ekleniyor:', {
          tour_name: tour.tour_name,
          id: tour.id
        });
        anaTurIds.set(tour.tour_name, tour.id);
      });

      // Yeni ana turları kaydet
      for (const anaTurAdi of anaTurlar) {
        console.log('Ana tur kontrol ediliyor:', {
          tour_name: anaTurAdi,
          exists: anaTurIds.has(anaTurAdi)
        });
        if (!anaTurIds.has(anaTurAdi)) {
          const [result] = await connection.query(
            'INSERT INTO main_tours (company_ref, tour_name) VALUES (?, ?)',
            [companyRef, anaTurAdi]
          );
          anaTurIds.set(anaTurAdi, result.insertId);
        }
      }

      // Turları kaydet
      for (const tourData of req.body) {
        const { mainTour, days, pickupTimes, options } = tourData;

        // Ana tur ID'sini bul
        const mainTourId = mainTour.main_tour_name ? anaTurIds.get(mainTour.main_tour_name) : null;

        console.log('Tur kaydediliyor:', {
          tour_name: mainTour.tour_name,
          main_tour_name: mainTour.main_tour_name,
          main_tour_id: mainTourId
        });

        const formatDate = (dateString) => {
          if (!dateString) return null;
          try {
            // Tarihi UTC olarak parse et ve yerel saat dilimine çevir
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;

            // Tarihi YYYY-MM-DD formatına çevir ve saat dilimi farkını düzelt
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            console.log('Tarih dönüşümü:', {
              input: dateString,
              parsed: date,
              formatted: `${year}-${month}-${day}`
            });

            return `${year}-${month}-${day}`;
          } catch (error) {
            console.error('Tarih formatı hatası:', error);
            return null;
          }
        };

        const insertQuery = `INSERT INTO tours (
          company_ref, tour_name, main_tour_id,
          operator, operator_id, 
          adult_price, child_price, guide_adult_price, guide_child_price, 
          is_active, priority, description, currency,
          start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // start_date ve end_date'i doğru şekilde formatla
        const tourStartDate = formatDate(mainTour.start_date);
        const tourEndDate = formatDate(mainTour.end_date);

        console.log('Tur tarihleri:', {
          original_start: mainTour.start_date,
          original_end: mainTour.end_date,
          formatted_start: tourStartDate,
          formatted_end: tourEndDate
        });

        const insertValues = [
          mainTour.company_ref,
          mainTour.tour_name,
          mainTourId,
          mainTour.operator,
          mainTour.operator_id,
          parseFloat(mainTour.adult_price) || 0,
          parseFloat(mainTour.child_price) || 0,
          parseFloat(mainTour.guide_adult_price) || 0,
          parseFloat(mainTour.guide_child_price) || 0,
          mainTour.is_active === false ? 0 : 1,
          parseInt(mainTour.priority) || 0,
          mainTour.description || '',
          mainTour.currency || 'EUR',
          tourStartDate,
          tourEndDate
        ];

        console.log('Kaydedilen tur değerleri:', {
          tour_name: mainTour.tour_name,
          main_tour_id: mainTourId,
          values: insertValues,
          dates: {
            start: tourStartDate,
            end: tourEndDate
          }
        });

        const [tourResult] = await connection.query(insertQuery, insertValues);
        const tourId = tourResult.insertId;

        // Bölgeleri kaydet
        if (Array.isArray(mainTour.bolgeler) && mainTour.bolgeler.length > 0) {
          // Boş region değerlerini filtrele
          const validRegions = mainTour.bolgeler.filter(region => region.trim() !== '');

          // Her benzersiz region için bir kayıt oluştur
          const uniqueRegions = [...new Set(validRegions)];

          const regionValues = uniqueRegions.map(region => [tourId, mainTour.company_ref, region]);
          
          if (regionValues.length > 0) {
            await connection.query(
              'INSERT INTO tour_regions (tour_id, company_id, region_name) VALUES ?',
              [regionValues]
            );
          }
        }

        // Günleri kaydet
        if (Array.isArray(days)) {
          // Önce bu tura ait tüm günleri sil
          await connection.query(
            'DELETE FROM tour_days WHERE tour_id = ?',
            [tourId]
          );

          // Gelen günlerin geçerli olduğundan emin ol (1-7 arası)
          const validDays = days.filter(day => day >= 0 && day <= 7);
          
          // 7 günlük bir dizi oluştur
          const fullWeekDays = Array(7).fill(0).map((_, index) => {
            const dayNumber = index + 1;
            return validDays.includes(dayNumber) ? dayNumber : 0;  // Seçili olmayan günler için 0
          });

          // Bulk insert kullan
          const dayValues = fullWeekDays.map(day => [tourId, day]);
          
          await connection.query(
            'INSERT INTO tour_days (tour_id, day_number) VALUES ?',
            [dayValues]
          );
        }

        // Kalkış zamanlarını kaydet
        if (Array.isArray(pickupTimes) && pickupTimes.length > 0) {
          console.log('Kaydedilecek pickup times:', pickupTimes);
          
          const timeValues = pickupTimes.map(time => {
            // isActive değerini period_active olarak 1/0 şeklinde dönüştür
            const periodActive = time.isActive === false ? 0 : 1;
            
            // Durdurma tarihlerini doğru şekilde formatla
            const startPickupDate = formatDate(time.start_pickup_date);
            const endPickupDate = formatDate(time.end_pickup_date);

            console.log('Pickup time dönüşümü:', {
              original: time,
              periodActive,
              isActive: time.isActive,
              start_pickup_date: startPickupDate,
              end_pickup_date: endPickupDate
            });

            return [
              tourId, 
              parseInt(time.company_id) || parseInt(companyRef),
              time.hour || '00',
              time.minute || '00',
              time.region || '',
              time.area || '',
              time.period || '1',
              periodActive,
              startPickupDate,
              endPickupDate
            ];
          });

          if (timeValues.length > 0) {
            try {
              await connection.query(
                `INSERT INTO tour_pickup_times 
                (tour_id, company_id, hour, minute, region, area, period, period_active, 
                 start_pickup_date, end_pickup_date) 
                VALUES ?`,
                [timeValues]
              );
              console.log('Pickup zamanları başarıyla kaydedildi');
            } catch (error) {
              console.error('Pickup zamanları kaydedilirken hata:', error);
              throw error;
            }
          }
        }

        // Seçenekleri kaydet
        if (Array.isArray(options) && options.length > 0) {
          const optionValues = options
            .filter(opt => opt.name || opt.option_name || opt.price)
            .map(opt => [
              tourId, 
              opt.option_name || opt.name || '',
              parseFloat(opt.price) || 0
            ]);

          if (optionValues.length > 0) {
            await connection.query(
              'INSERT INTO tour_options (tour_id, option_name, price) VALUES ?',
              [optionValues]
            );
          }
        }
      }

      await connection.commit();
      console.log('Kayıt başarılı');
      res.json({ 
        success: true, 
        message: 'Turlar başarıyla kaydedildi',
        savedCount: req.body.length
      });

    } catch (error) {
      await connection.rollback();
      console.error('Tour kaydetme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Turlar kaydedilirken bir hata oluştu',
        error: error.message
      });
    }
  });

  // Turları getirme endpoint'i
  router.get('/:companyRef', async (req, res) => {
    const connection = await db.promise();
    try {
      const { companyRef } = req.params;

      // Turları getir
      const [tours] = await connection.query(
        `SELECT t.*, mt.tour_name as main_tour_name
         FROM tours t
         LEFT JOIN main_tours mt ON t.main_tour_id = mt.id
         WHERE t.company_ref = ?`,
        [companyRef]
      );

      // Her tur için ilişkili verileri al
      const fullTours = await Promise.all(tours.map(async (tour) => {
        // Günleri al
        const [days] = await connection.query(
          'SELECT day_number FROM tour_days WHERE tour_id = ?',
          [tour.id]
        );

        // Kalkış zamanlarını al
        const [pickupTimes] = await connection.query(
          'SELECT *, company_id, period_active as isActive, start_pickup_date, end_pickup_date FROM tour_pickup_times WHERE tour_id = ?',
          [tour.id]
        );

        // Seçenekleri al
        const [options] = await connection.query(
          'SELECT * FROM tour_options WHERE tour_id = ?',
          [tour.id]
        );

        // Bölgeleri al
        const [regions] = await connection.query(
          'SELECT region_name FROM tour_regions WHERE tour_id = ?',
          [tour.id]
        );

        return {
          mainTour: {
            id: tour.id,
            company_ref: tour.company_ref,
            tour_name: tour.tour_name,
            main_tour_name: tour.main_tour_name,
            operator: tour.operator,
            operator_id: tour.operator_id,
            adult_price: tour.adult_price,
            child_price: tour.child_price,
            guide_adult_price: tour.guide_adult_price,
            guide_child_price: tour.guide_child_price,
            is_active: tour.is_active === 1,
            priority: parseInt(tour.priority) || 0,
            bolgeler: regions.map(r => r.region_name),
            description: tour.description || '',
            currency: tour.currency || 'EUR',
            start_date: tour.start_date,
            end_date: tour.end_date
          },
          days: days.map(d => d.day_number),
          pickupTimes: pickupTimes.map(time => ({
            ...time,
            isActive: time.period_active === 1,
            stopSelling: time.start_pickup_date !== null || time.end_pickup_date !== null,
            stopSaleStartDate: time.start_pickup_date,
            stopSaleEndDate: time.end_pickup_date
          })),
          options
        };
      }));

      res.json({
        success: true,
        data: fullTours
      });

    } catch (error) {
      console.error('Tur getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Turlar getirilirken bir hata oluştu',
        error: error.message
      });
    }
  });

  // Tur silme endpoint'i
  router.delete('/:tourId', async (req, res) => {
    const connection = await db.promise();
    try {
      const { tourId } = req.params;

      await connection.beginTransaction();

      // Önce silinecek turun main_tour_id'sini al
      const [tourInfo] = await connection.query(
        'SELECT main_tour_id FROM tours WHERE id = ?',
        [tourId]
      );

      const mainTourId = tourInfo[0]?.main_tour_id;

      // İlişkili kayıtları sil
      await connection.query('DELETE FROM tour_regions WHERE tour_id = ?', [tourId]);
      await connection.query('DELETE FROM tour_days WHERE tour_id = ?', [tourId]);
      await connection.query('DELETE FROM tour_pickup_times WHERE tour_id = ?', [tourId]);
      await connection.query('DELETE FROM tour_options WHERE tour_id = ?', [tourId]);
      
      // Turu sil
      await connection.query('DELETE FROM tours WHERE id = ?', [tourId]);

      // Eğer main_tour_id varsa, bu ana tura bağlı başka tur var mı kontrol et
      if (mainTourId) {
        const [remainingTours] = await connection.query(
          'SELECT COUNT(*) as count FROM tours WHERE main_tour_id = ?',
          [mainTourId]
        );

        // Eğer bu ana tura bağlı başka tur kalmadıysa, ana turu da sil
        if (remainingTours[0].count === 0) {
          await connection.query(
            'DELETE FROM main_tours WHERE id = ?',
            [mainTourId]
          );
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Tur başarıyla silindi'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Tur silme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Tur silinirken bir hata oluştu',
        error: error.message
      });
    }
  });

  return router;
}; 
const express = require('express');
const router = express.Router();
const https = require('https');
const xml2js = require('xml2js');

// Currency rates'i almak için yardımcı fonksiyon
async function getCurrencyRates() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.tcmb.gov.tr',
      path: '/kurlar/today.xml',
      method: 'GET',
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 10000, // 10 saniye timeout
      rejectUnauthorized: false // SSL sertifika hatalarını görmezden gel
    };

    let retryCount = 0;
    const maxRetries = 3;

    const makeRequest = () => {
      const request = https.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', async () => {
          try {
            if (!data) {
              throw new Error('Boş yanıt alındı');
            }

            const parser = new xml2js.Parser({ explicitArray: false });
            const result = await parser.parseStringPromise(data);
            
            if (!result || !result.Tarih_Date || !result.Tarih_Date.Currency) {
              throw new Error('Geçersiz XML yapısı');
            }

            const currencies = Array.isArray(result.Tarih_Date.Currency) 
              ? result.Tarih_Date.Currency 
              : [result.Tarih_Date.Currency];

            const mainCurrencies = ['USD', 'EUR', 'GBP'];
            const rateStrings = [];

            mainCurrencies.forEach(currencyCode => {
              const currency = currencies.find(c => c.$.Kod === currencyCode);
              if (currency) {
                rateStrings.push(`${currencyCode}:${currency.ForexBuying}`);
              }
            });

            if (rateStrings.length === 0) {
              throw new Error('Döviz kurları alınamadı');
            }

            resolve(rateStrings.join(','));
          } catch (error) {
            handleError(error);
          }
        });
      });

      request.on('error', handleError);
      request.on('timeout', () => {
        request.destroy();
        handleError(new Error('Bağlantı zaman aşımı'));
      });

      request.end();

      function handleError(error) {
        console.error(`TCMB API Hatası (Deneme ${retryCount + 1}/${maxRetries}):`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Yeniden deneniyor (${retryCount}/${maxRetries})...`);
          setTimeout(makeRequest, 1000 * retryCount); // Her denemede artan bekleme süresi
        } else {
          // Tüm denemeler başarısız olursa varsayılan değerleri kullan
          console.log('Varsayılan döviz kurları kullanılıyor');
          resolve('USD:30.00,EUR:32.00,GBP:37.00');
        }
      }
    };

    makeRequest();
  });
}

// 6 haneli rastgele sayı oluşturan yardımcı fonksiyon
function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000);
}

module.exports = (db) => {
  // Yeni rezervasyon oluştur
  router.post('/', async (req, res) => {
    try {
      const {
        customerInfo,
        tickets,
        totalAmount,
        cost,
        userData
      } = req.body;

      // Calculate total cost
      const totalCost = tickets.reduce((acc, ticket) => {
        const adultCost = (Number(ticket.counts.adult) || 0) * (Number(ticket.guideAdultPrice) || 0);
        const childCost = (Number(ticket.counts.half) || 0) * (Number(ticket.guideChildPrice) || 0);
        return acc + adultCost + childCost;
      }, 0);

      // userData'dan company_id'yi kontrol edelim
      if (!userData || !userData.companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }

      // Get current rates string
      const currencyRates = await getCurrencyRates();
      const ticketCount = tickets.length;
      const fullPhoneNumber = `${customerInfo.phoneCode}${customerInfo.phone}`;

      const [reservationResult] = await db.promise().query(
        `INSERT INTO reservations 
        (customer_name, phone, room_number, hotel_name, total_amount, cost, ticket_count, 
         guide_name, commission_rate, status, currency_rates, company_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerInfo.name,
          fullPhoneNumber,
          customerInfo.roomNumber,
          customerInfo.hotelName,
          totalAmount,
          cost || 0,
          ticketCount,
          `${userData.name} ${userData.surname}`,
          userData.entitlement || 0,
          1,
          currencyRates,
          userData.companyId
        ]
      );

      const reservationId = reservationResult.insertId;

      // Ödeme yöntemlerini kaydet
      for (const payment of customerInfo.paymentMethods) {
        await db.promise().query(
          `INSERT INTO reservation_payments 
          (reservation_id, payment_type, amount, currency, rest_amount) 
          VALUES (?, ?, ?, ?, ?)`,
          [
            reservationId,
            payment.type,
            payment.amount,
            payment.currency,
            payment.rest || null
          ]
        );
      }

      // Biletleri kaydet
      for (const ticket of tickets) {
        // Debug için ticket objesini detaylı logla
        console.log('Saving ticket details:', {
          tourName: ticket.tourName,
          originalLength: ticket.tourName?.length,
          tourNameType: typeof ticket.tourName,
          fullTicket: JSON.stringify(ticket, null, 2)
        });

        // İlk bilet için rest tutarlarını hesapla
        let totalRestAmount = null;
        // En erken tarih ve saati olan bilet için rest tutarlarını ekle
        if (tickets.every(otherTicket => {
          return (
            new Date(ticket.date) < new Date(otherTicket.date) || 
            (ticket.date === otherTicket.date && ticket.time <= otherTicket.time)
          );
        }) && customerInfo.paymentMethods.length > 0) {
          const restAmounts = customerInfo.paymentMethods
            .filter(payment => payment.rest && payment.rest !== '0')
            .map(payment => `${payment.rest} ${payment.currency}`)
            .join(',');
          
          if (restAmounts) {
            totalRestAmount = restAmounts;
          }
        }

        // Tarihi MySQL formatına çevir
        const formatDate = (dateStr) => {
          const [day, month, year] = dateStr.split('.');
          return `${year}-${month}-${day}`;
        };

        // Veritabanı alanının maksimum uzunluğunu kontrol et
        const [tableInfo] = await db.promise().query(
          "SHOW COLUMNS FROM reservation_tickets WHERE Field = 'tour_name'"
        );
        console.log('Database tour_name field info:', tableInfo[0]);

        const query = `
          INSERT INTO reservation_tickets 
          (reservation_id, tour_name, tour_group_name, adult_count, child_count, free_count, 
           adult_price, half_price, currency, date, guide_ref, guide_name, provider_name, 
           provider_ref, comment, time, regions, total_rest_amount, status, cancellation_reason,
           ticket_number) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [ticketResult] = await db.promise().query(
          query,
          [
            reservationId,
            ticket.tourName,
            ticket.tourGroup,
            ticket.counts.adult,
            ticket.counts.half,
            ticket.counts.free,
            ticket.adultPrice || null,
            ticket.halfPrice || null,
            ticket.currency,
            formatDate(ticket.date),
            userData.code,
            userData.name,
            ticket.operator || null,
            ticket.operatorId || null,
            ticket.note || null,
            ticket.time,
            ticket.regions ? ticket.regions.join(',') : null,
            totalRestAmount,
            1, // default status
            null, // default cancellation_reason
            ticket.ticket_no
          ]
        );

        // Kaydedilen veriyi kontrol et
        const [savedTicket] = await db.promise().query(
          'SELECT tour_name FROM reservation_tickets WHERE id = ?',
          [ticketResult.insertId]
        );
        console.log('Saved tour_name:', savedTicket[0].tour_name);

        // Bilet opsiyonlarını kaydet
        if (ticket.options && ticket.options.length > 0) {
          for (const option of ticket.options) {
            await db.promise().query(
              `INSERT INTO ticket_options 
              (ticket_id, option_name, price) 
              VALUES (?, ?, ?)`,
              [ticketResult.insertId, option.name, option.price]
            );
          }
        }
      }

      res.status(201).json({
        success: true,
        message: 'Rezervasyon başarıyla kaydedildi',
        reservationId: reservationResult.insertId
      });

    } catch (error) {
      console.error('Rezervasyon kayıt hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Rezervasyon kaydedilirken bir hata oluştu',
        error: error.message
      });
    }
  });

  // Get all reservations
  router.get('/', async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          *,
          cost,
          CASE  
            WHEN status = 0 THEN 'Beklemede'
            WHEN status = 1 THEN 'Onaylandı'
            WHEN status = 2 THEN 'İptal Edildi'
            ELSE 'Bilinmiyor'
          END as status_text 
        FROM reservations 
        ORDER BY id DESC
      `);
      
      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching reservations',
        error: error.message
      });
    }
  });

  // Update reservation status
  router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      await db.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
      res.json({
        success: true,
        message: 'Reservation status updated successfully'
      });
    } catch (error) {
      console.error('Error updating reservation:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating reservation',
        error: error.message
      });
    }
  });

  return router;
};
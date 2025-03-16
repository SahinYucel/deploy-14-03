const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // payment_type sütununu güncelle
    const alterTableQuery = `
        ALTER TABLE reservation_payments 
        MODIFY COLUMN payment_type VARCHAR(20)
    `;

    db.query(alterTableQuery, (error) => {
        if (error) {
            console.error('payment_type sütunu güncellenirken hata:', error);
        }
    });

    // Tüm rezervasyonları ve ticket'ları getir
    router.get('/', (req, res) => {
        const query = `
            SELECT DISTINCT
                r.id as reservation_id,
                r.customer_name,
                r.phone,
                r.hotel_name,
                r.room_number,
                r.ticket_count,
                r.guide_name,
                r.commission_rate,
                r.main_comment,
                r.created_at,
                (
                    SELECT SUM((rt2.adult_count * rt2.adult_price) + (rt2.child_count * rt2.half_price))
                    FROM reservation_tickets rt2
                    WHERE rt2.reservation_id = r.id
                ) as cost,
                r.currency_rates,
                r.status,
                rt.id as ticket_id,
                rt.ticket_number,
                rt.tour_name,
                rt.tour_group_name,
                rt.adult_count,
                rt.child_count,
                rt.free_count,
                rt.currency,
                rt.date,
                rt.regions,
                rt.guide_ref,
                rt.guide_name as ticket_guide_name,
                rt.provider_name,
                rt.provider_ref,
                rt.time,
                rt.adult_price,
                rt.half_price,
                rt.total_rest_amount,
                rt.comment,
                rt.cancellation_reason,
                rt.status as ticket_status,
                (
                    SELECT GROUP_CONCAT(
                        CASE 
                            WHEN currency = 'TRY' THEN CONCAT(amount, ' TRY')
                            WHEN currency = 'USD' THEN CONCAT(amount, ' USD')
                            WHEN currency = 'EUR' THEN CONCAT(amount, ' EUR')
                            WHEN currency = 'GBP' THEN CONCAT(amount, ' GBP')
                            ELSE CONCAT(amount, ' ', currency)
                        END
                        SEPARATOR ', '
                    )
                    FROM reservation_payments
                    WHERE reservation_id = r.id
                ) as total_amount
            FROM 
                (SELECT * FROM reservations ORDER BY id DESC LIMIT 100) r
            LEFT JOIN reservation_tickets rt ON r.id = rt.reservation_id
            ORDER BY r.id DESC
        `;

        db.query(query, (error, results) => {
            if (error) {
                console.error('Rezervasyon bilgileri alınırken hata:', error);
                return res.status(500).json({
                    error: 'Rezervasyon bilgileri alınamadı'
                });
            }

            // Rezervasyonları ve ticket'ları grupla
            const formattedResults = results.reduce((acc, curr) => {
                if (!acc[curr.reservation_id]) {
                    acc[curr.reservation_id] = {
                        id: curr.reservation_id,
                        customer_name: curr.customer_name,
                        phone: curr.phone,
                        hotel_name: curr.hotel_name,
                        room_number: curr.room_number,
                        ticket_count: curr.ticket_count,
                        guide_name: curr.guide_name,
                        commission_rate: curr.commission_rate,
                        main_comment: curr.main_comment,
                        created_at: curr.created_at,
                        cost: curr.cost,
                        total_amount: curr.total_amount,
                        currency_rates: curr.currency_rates,
                        status: curr.status === 1,
                        tickets: []
                    };
                }

                if (curr.ticket_id) {
                    acc[curr.reservation_id].tickets.push({
                        id: curr.ticket_id,
                        ticket_number: curr.ticket_number,
                        tour_name: curr.tour_name,
                        tour_group_name: curr.tour_group_name,
                        adult_count: curr.adult_count,
                        child_count: curr.child_count,
                        free_count: curr.free_count,
                        currency: curr.currency,
                        date: curr.date,
                        regions: curr.regions,
                        guide_ref: curr.guide_ref,
                        guide_name: curr.ticket_guide_name,
                        provider_name: curr.provider_name,
                        provider_ref: curr.provider_ref,
                        time: curr.time,
                        adult_price: curr.adult_price,
                        half_price: curr.half_price,
                        total_rest_amount: curr.total_rest_amount,
                        comment: curr.comment,
                        cancellation_reason: curr.cancellation_reason,
                        status: curr.ticket_status
                    });
                }

                return acc;
            }, {});

            // Object.values'u sıralayarak döndür
            const sortedResults = Object.values(formattedResults).sort((a, b) => b.id - a.id);
            res.json(sortedResults);
        });
    });

    // Belirli bir şirkete ait rezervasyonları getir
    router.get('/company/:companyId', (req, res) => {
        const companyId = req.params.companyId;
        const query = `
            SELECT 
                id as reservation_id,
                customer_name,
                phone as customer_phone,
                room_number,
                hotel_name,
                total_amount,
                ticket_count,
                guide_name,
                commission_rate,
                status,
                currency_rates,
                company_id
            FROM reservations
            WHERE company_id = ?
            ORDER BY id DESC
        `;

        db.query(query, [companyId], (error, results) => {
            if (error) {
                console.error('Şirket rezervasyonları alınırken hata:', error);
                return res.status(500).json({
                    error: 'Şirket rezervasyonları alınamadı'
                });
            }
            res.json(results);
        });
    });

    // Rezervasyon güncelleme endpoint'i
    router.put('/:id', (req, res) => {
        const reservationId = req.params.id;
        const {
            customer_name,
            phone,
            hotel_name,
            room_number,
            guide_name,
            commission_rate,
            main_comment,
            status,
            cost,
            total_amount,
            currency_rates
        } = req.body;

        const query = `
            UPDATE reservations 
            SET 
                customer_name = ?,
                phone = ?,
                hotel_name = ?,
                room_number = ?,
                guide_name = ?,
                commission_rate = ?,
                main_comment = ?,
                status = ?,
                cost = ?,
                total_amount = ?,
                currency_rates = ?
            WHERE id = ?
        `;

        db.query(
            query,
            [
                customer_name, 
                phone, 
                hotel_name, 
                room_number, 
                guide_name, 
                commission_rate, 
                main_comment, 
                status ? 1 : 0,
                cost,
                total_amount,
                currency_rates,
                reservationId
            ],
            (error, results) => {
                if (error) {
                    console.error('Rezervasyon güncelleme hatası:', error);
                    return res.status(500).json({
                        error: 'Rezervasyon güncellenirken bir hata oluştu'
                    });
                }

                res.json({
                    message: 'Rezervasyon başarıyla güncellendi',
                    affectedRows: results.affectedRows
                });
            }
        );
    });

    // Bilet güncelleme endpoint'i
    router.put('/ticket/:id', (req, res) => {
        const ticketId = req.params.id;
        const {
            ticket_number,
            tour_name,
            tour_group_name,
            adult_count,
            child_count,
            free_count,
            currency,
            date,
            regions,
            time,
            adult_price,
            half_price,
            total_rest_amount,
            comment,
            cancellation_reason,
            status
        } = req.body;

        const query = `
            UPDATE reservation_tickets 
            SET 
                ticket_number = ?,
                tour_name = ?,
                tour_group_name = ?,
                adult_count = ?,
                child_count = ?,
                free_count = ?,
                currency = ?,
                date = ?,
                regions = ?,
                time = ?,
                adult_price = ?,
                half_price = ?,
                total_rest_amount = ?,
                comment = ?,
                cancellation_reason = ?,
                status = ?
            WHERE id = ?
        `;

        const values = [
            ticket_number,
            tour_name,
            tour_group_name,
            adult_count,
            child_count,
            free_count,
            currency,
            date,
            regions,
            time,
            adult_price,
            half_price,
            total_rest_amount,
            comment,
            cancellation_reason,
            status,
            ticketId
        ];

        db.query(query, values, (error, results) => {
            if (error) {
                console.error('Bilet güncelleme hatası:', error);
                return res.status(500).json({
                    error: 'Bilet güncellenemedi',
                    details: error.message
                });
            }

            res.json({
                message: 'Bilet başarıyla güncellendi',
                affectedRows: results.affectedRows
            });
        });
    });

    // Turları getirme endpoint'i
    router.get('/tours', (req, res) => {
        const query = `
            SELECT 
                t.id,
                t.tour_name as name,
                t.description,
                t.adult_price as price,
                t.currency
            FROM tours t
            ORDER BY t.tour_name ASC
        `;

        db.query(query, (error, results) => {
            if (error) {
                console.error('Turlar alınırken hata:', error);
                return res.status(500).json({
                    error: 'Turlar alınamadı'
                });
            }

            res.json(results);
        });
    });

    // Tur gruplarını getirme endpoint'i
    router.get('/tour-groups', (req, res) => {
        const query = `
            SELECT 
                mt.id,
                mt.tour_name as group_name,
                COUNT(t.id) as tour_count
            FROM main_tours mt
            LEFT JOIN tours t ON t.main_tour_id = mt.id
            GROUP BY mt.id, mt.tour_name
            ORDER BY mt.tour_name ASC
        `;

        db.query(query, (error, results) => {
            if (error) {
                console.error('Tur grupları alınırken hata:', error);
                return res.status(500).json({
                    error: 'Tur grupları alınamadı'
                });
            }

            res.json(results);
        });
    });

    // Seçilen gruba ait turları getirme endpoint'i
    router.get('/tours/:groupId', (req, res) => {
        const groupId = req.params.groupId;
        const query = `
            SELECT 
                t.id,
                t.tour_name as name,
                t.description,
                t.adult_price as price,
                t.currency
            FROM tours t
            WHERE t.main_tour_id = ?
            ORDER BY t.tour_name ASC
        `;

        db.query(query, [groupId], (error, results) => {
            if (error) {
                console.error('Grup turları alınırken hata:', error);
                return res.status(500).json({
                    error: 'Grup turları alınamadı'
                });
            }

            res.json(results);
        });
    });

    // Bölgeleri getirme endpoint'i
    router.get('/regions', (req, res) => {
        const query = `
            SELECT DISTINCT
                tr.region_name as name
            FROM tour_regions tr
            ORDER BY tr.region_name ASC
        `;

        db.query(query, (error, results) => {
            if (error) {
                console.error('Bölgeler alınırken hata:', error);
                return res.status(500).json({
                    error: 'Bölgeler alınamadı'
                });
            }

            res.json(results);
        });
    });

    // Seçilen bölgeye ait turları getirme endpoint'i
    router.get('/tours/by-region/:regionName', (req, res) => {
        const regionName = req.params.regionName;
        const query = `
            SELECT DISTINCT
                t.id,
                t.tour_name as name,
                t.description,
                t.adult_price as price,
                t.child_price,
                t.currency,
                mt.id as main_tour_id,
                mt.tour_name as group_name
            FROM tours t
            INNER JOIN tour_regions tr ON tr.tour_id = t.id
            LEFT JOIN main_tours mt ON mt.id = t.main_tour_id
            WHERE tr.region_name = ?
            ORDER BY t.tour_name ASC
        `;

        db.query(query, [regionName], (error, results) => {
            if (error) {
                console.error('Bölge turları alınırken hata:', error);
                return res.status(500).json({
                    error: 'Bölge turları alınamadı'
                });
            }

            res.json(results);
        });
    });

    // Rehberleri getirme endpoint'i rezervasyonlar için
    router.get('/reservation-guides', (req, res) => {
        const query = `
            SELECT 
                id,
                name,
                surname,
                is_active,
                nickname
            FROM agencyguide
            WHERE is_active = 1
            ORDER BY name ASC
        `;

        db.query(query, (error, results) => {
            if (error) {
                console.error('Rehberler alınırken hata:', error);
                return res.status(500).json({
                    error: 'Rehberler alınamadı'
                });
            }

            const formattedResults = results.map(guide => ({
                id: guide.id,
                name: `${guide.name} ${guide.surname} `
            }));

            res.json(formattedResults);
        });
    });

    // Belirli bir rezervasyonun ödemelerini getirme endpoint'i
    router.get('/:reservationId/payments', (req, res) => {
        const { reservationId } = req.params;
        const query = `
            SELECT 
                id,
                reservation_id,
                payment_type,
                amount,
                rest_amount,
                currency
            FROM reservation_payments
            WHERE reservation_id = ?
            ORDER BY id DESC
        `;

        db.query(query, [reservationId], (error, results) => {
            if (error) {
                console.error('Ödeme bilgileri alınırken hata:', error);
                return res.status(500).json({
                    error: 'Ödeme bilgileri alınamadı'
                });
            }

            res.json(results);
        });
    });

    // Yeni ödeme ekleme endpoint'i
    router.post('/:reservationId/payments', (req, res) => {
        const { reservationId } = req.params;
        const { payment_type, amount, rest_amount, currency } = req.body;

        const query = `
            INSERT INTO reservation_payments (
                reservation_id,
                payment_type,
                amount,
                rest_amount,
                currency
            ) VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            query,
            [reservationId, payment_type, amount, rest_amount, currency],
            (error, results) => {
                if (error) {
                    console.error('Ödeme kaydedilirken hata:', error);
                    return res.status(500).json({
                        error: 'Ödeme kaydedilemedi'
                    });
                }

                res.json({
                    message: 'Ödeme başarıyla kaydedildi',
                    paymentId: results.insertId
                });
            }
        );
    });

    // Ödeme güncelleme endpoint'i
    router.put('/:reservationId/payments/:paymentId', (req, res) => {
        const { reservationId, paymentId } = req.params;
        const { amount, currency, payment_type } = req.body;

        const query = `
            UPDATE reservation_payments 
            SET amount = ?, currency = ?, payment_type = ?
            WHERE id = ? AND reservation_id = ?
        `;

        db.query(
            query,
            [amount, currency, payment_type, paymentId, reservationId],
            (error, results) => {
                if (error) {
                    console.error('Ödeme güncellenirken hata:', error);
                    return res.status(500).json({
                        error: 'Ödeme güncellenemedi',
                        details: error.message
                    });
                }

                res.json({
                    message: 'Ödeme başarıyla güncellendi',
                    affectedRows: results.affectedRows
                });
            }
        );
    });

    // Ödeme silme endpoint'i
    router.delete('/:reservationId/payments/:paymentId', (req, res) => {
        const { reservationId, paymentId } = req.params;
        
        const query = `
            DELETE FROM reservation_payments 
            WHERE id = ? AND reservation_id = ?
        `;

        db.query(query, [paymentId, reservationId], (error, results) => {
            if (error) {
                console.error('Ödeme silinirken hata:', error);
                return res.status(500).json({
                    error: 'Ödeme silinirken bir hata oluştu'
                });
            }

            res.json({
                message: 'Ödeme başarıyla silindi',
                affectedRows: results.affectedRows
            });
        });
    });

    router.get('/ticket/:ticketId/options', (req, res) => {
        const { ticketId } = req.params;
        console.log('Fetching options for ticket:', ticketId);

        const query = `
            SELECT 
                id,
                ticket_id,
                option_name,
                price
            FROM ticket_options
            WHERE ticket_id = ?
            ORDER BY id DESC
        `;

        db.query(query, [ticketId], (error, results) => {
            if (error) {
                console.error('Bilet opsiyonları alınırken hata:', error);
                return res.status(500).json({
                    error: 'Bilet opsiyonları alınamadı'
                });
            }

            console.log('Found options:', results);
            res.json(results);
        });
    });

    // Opsiyon ekleme endpoint'i
    router.post('/ticket/:ticketId/options', (req, res) => {
        const { ticketId } = req.params;
        const { option_name, price } = req.body;

        console.log('Adding option:', { ticketId, option_name, price });

        const query = `
            INSERT INTO ticket_options (
                ticket_id,
                option_name,
                price
            ) VALUES (?, ?, ?)
        `;

        db.query(
            query,
            [ticketId, option_name, price],
            (error, results) => {
                if (error) {
                    console.error('Opsiyon eklenirken hata:', error);
                    return res.status(500).json({
                        error: 'Opsiyon eklenemedi'
                    });
                }

                res.json({
                    message: 'Opsiyon başarıyla eklendi',
                    optionId: results.insertId
                });
            }
        );
    });

    // Opsiyon silme endpoint'i
    router.delete('/ticket/:ticketId/options/:optionId', (req, res) => {
        const { ticketId, optionId } = req.params;

        console.log('Deleting option:', { ticketId, optionId });

        const query = `
            DELETE FROM ticket_options 
            WHERE id = ? AND ticket_id = ?
        `;

        db.query(query, [optionId, ticketId], (error, results) => {
            if (error) {
                console.error('Opsiyon silinirken hata:', error);
                return res.status(500).json({
                    error: 'Opsiyon silinemedi'
                });
            }

            res.json({
                message: 'Opsiyon başarıyla silindi',
                affectedRows: results.affectedRows
            });
        });
    });

    // Filtreleme endpoint'i
    router.post('/filter', (req, res) => {
        const {
            customer_name,
            phone,
            hotel_name,
            room_number,
            guide_name,
            ticket_number,
            date,
            date_next,
            status
        } = req.body;

        let conditions = [];
        let params = [];

        // Şirket ID kontrolü - session'dan veya request'ten al
        const companyId = req.session?.companyId || req.user?.companyId;
        
        // Eğer companyId yoksa, tüm rezervasyonları getir (geliştirme amaçlı)
        // Gerçek ortamda bu kısım kaldırılabilir ve yetkilendirme hatası döndürülebilir
        if (companyId) {
            conditions.push('r.company_id = ?');
            params.push(companyId);
        } else {
            console.warn('Filtreleme yapılırken şirket ID bulunamadı. Tüm rezervasyonlar getirilecek.');
        }

        if (customer_name) {
            conditions.push('r.customer_name LIKE ?');
            params.push(`%${customer_name}%`);
        }

        if (phone) {
            conditions.push('r.phone LIKE ?');
            params.push(`%${phone}%`);
        }

        if (hotel_name) {
            conditions.push('r.hotel_name LIKE ?');
            params.push(`%${hotel_name}%`);
        }

        if (room_number) {
            conditions.push('r.room_number LIKE ?');
            params.push(`%${room_number}%`);
        }

        if (guide_name) {
            conditions.push('r.guide_name LIKE ?');
            params.push(`%${guide_name}%`);
        }

        if (date) {
            // Eğer date_next varsa, tarih aralığı olarak filtrele
            if (date_next) {
                conditions.push('(DATE(r.created_at) >= ? AND DATE(r.created_at) <= ?)');
                params.push(date, date_next);
            } else {
                // Sadece belirli bir tarih için filtrele
                conditions.push('DATE(r.created_at) = ?');
                params.push(date);
            }
        }

        if (status !== undefined) {
            conditions.push('r.status = ?');
            params.push(status ? 1 : 0);
        }

        if (ticket_number) {
            conditions.push('EXISTS (SELECT 1 FROM reservation_tickets rt WHERE rt.reservation_id = r.id AND rt.ticket_number LIKE ?)');
            params.push(`%${ticket_number}%`);
        }

        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}` 
            : '';

        const query = `
            SELECT DISTINCT
                r.id as reservation_id,
                r.customer_name,
                r.phone,
                r.hotel_name,
                r.room_number,
                r.ticket_count,
                r.guide_name,
                r.commission_rate,
                r.main_comment,
                r.created_at,
                (
                    SELECT SUM((rt2.adult_count * rt2.adult_price) + (rt2.child_count * rt2.half_price))
                    FROM reservation_tickets rt2
                    WHERE rt2.reservation_id = r.id
                ) as cost,
                r.currency_rates,
                r.status,
                rt.id as ticket_id,
                rt.ticket_number,
                rt.tour_name,
                rt.tour_group_name,
                rt.adult_count,
                rt.child_count,
                rt.free_count,
                rt.currency,
                rt.date,
                rt.regions,
                rt.guide_ref,
                rt.guide_name as ticket_guide_name,
                rt.provider_name,
                rt.provider_ref,
                rt.time,
                rt.adult_price,
                rt.half_price,
                rt.total_rest_amount,
                rt.comment,
                rt.cancellation_reason,
                rt.status as ticket_status,
                (
                    SELECT GROUP_CONCAT(
                        CASE 
                            WHEN currency = 'TRY' THEN CONCAT(amount, ' TRY')
                            WHEN currency = 'USD' THEN CONCAT(amount, ' USD')
                            WHEN currency = 'EUR' THEN CONCAT(amount, ' EUR')
                            WHEN currency = 'GBP' THEN CONCAT(amount, ' GBP')
                            ELSE CONCAT(amount, ' ', currency)
                        END
                        SEPARATOR ', '
                    )
                    FROM reservation_payments
                    WHERE reservation_id = r.id
                ) as total_amount
            FROM 
                reservations r
            LEFT JOIN reservation_tickets rt ON r.id = rt.reservation_id
            ${whereClause}
            ORDER BY r.id DESC
            LIMIT 2000
        `;

        db.query(query, params, (error, results) => {
            if (error) {
                console.error('Rezervasyon filtreleme hatası:', error);
                return res.status(500).json({
                    error: 'Rezervasyonlar filtrelenirken bir hata oluştu'
                });
            }

            // Rezervasyonları ve ticket'ları grupla
            const formattedResults = results.reduce((acc, curr) => {
                if (!acc[curr.reservation_id]) {
                    acc[curr.reservation_id] = {
                        id: curr.reservation_id,
                        customer_name: curr.customer_name,
                        phone: curr.phone,
                        hotel_name: curr.hotel_name,
                        room_number: curr.room_number,
                        ticket_count: curr.ticket_count,
                        guide_name: curr.guide_name,
                        commission_rate: curr.commission_rate,
                        main_comment: curr.main_comment,
                        created_at: curr.created_at,
                        cost: curr.cost,
                        total_amount: curr.total_amount,
                        currency_rates: curr.currency_rates,
                        status: curr.status === 1,
                        tickets: []
                    };
                }

                if (curr.ticket_id) {
                    acc[curr.reservation_id].tickets.push({
                        id: curr.ticket_id,
                        ticket_number: curr.ticket_number,
                        tour_name: curr.tour_name,
                        tour_group_name: curr.tour_group_name,
                        adult_count: curr.adult_count,
                        child_count: curr.child_count,
                        free_count: curr.free_count,
                        currency: curr.currency,
                        date: curr.date,
                        regions: curr.regions,
                        guide_ref: curr.guide_ref,
                        guide_name: curr.ticket_guide_name,
                        provider_name: curr.provider_name,
                        provider_ref: curr.provider_ref,
                        time: curr.time,
                        adult_price: curr.adult_price,
                        half_price: curr.half_price,
                        total_rest_amount: curr.total_rest_amount,
                        comment: curr.comment,
                        cancellation_reason: curr.cancellation_reason,
                        status: curr.ticket_status
                    });
                }

                return acc;
            }, {});

            // Object.values'u sıralayarak döndür
            const sortedResults = Object.values(formattedResults).sort((a, b) => b.id - a.id);
            res.json(sortedResults);
        });
    });

    return router;
}; 
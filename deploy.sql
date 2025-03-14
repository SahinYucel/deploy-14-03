-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Anamakine: localhost:3306
-- Üretim Zamanı: 06 Mar 2025, 01:03:50
-- Sunucu sürümü: 8.0.41-0ubuntu0.24.04.1
-- PHP Sürümü: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `tour_program`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `reservations`
--

CREATE TABLE `reservations` (
  `id` int NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `hotel_name` varchar(255) DEFAULT NULL,
  `total_amount` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ticket_count` int NOT NULL DEFAULT '0',
  `guide_name` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT '0.00',
  `status` tinyint NOT NULL DEFAULT '0',
  `currency_rates` varchar(255) DEFAULT NULL,
  `company_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Tablo döküm verisi `reservations`
--

INSERT INTO `reservations` (`id`, `customer_name`, `phone`, `room_number`, `hotel_name`, `total_amount`, `created_at`, `ticket_count`, `guide_name`, `description`, `commission_rate`, `status`, `currency_rates`, `company_id`) VALUES
(113, 'Berry', '+444466', '123', 'Ght', '500 TL', '2025-03-06 01:00:17', 3, 'Şahin Yücel', NULL, 40.00, 0, 'USD:36.3682,EUR:38.8476,GBP:46.5634', 119),
(114, 'Guf', '+440990', '8989', 'Khkh', '2000 TL', '2025-03-06 01:00:31', 2, 'Şahin Yücel', NULL, 40.00, 0, 'USD:36.3682,EUR:38.8476,GBP:46.5634', 119),
(115, 'Berry', '+444466', '123', 'Ght', '500 TL', '2025-03-06 01:02:39', 3, 'Şahin Yücel', NULL, 40.00, 0, 'USD:36.3682,EUR:38.8476,GBP:46.5634', 119);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `reservation_payments`
--

CREATE TABLE `reservation_payments` (
  `id` int NOT NULL,
  `reservation_id` int NOT NULL,
  `payment_type` enum('cash','pos') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `rest_amount` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Tablo döküm verisi `reservation_payments`
--

INSERT INTO `reservation_payments` (`id`, `reservation_id`, `payment_type`, `amount`, `currency`, `rest_amount`) VALUES
(166, 113, 'cash', 500.00, 'TL', NULL),
(167, 114, 'cash', 2000.00, 'TL', NULL),
(168, 115, 'cash', 500.00, 'TL', NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `reservation_tickets`
--

CREATE TABLE `reservation_tickets` (
  `id` int NOT NULL,
  `reservation_id` int NOT NULL,
  `tour_name` varchar(255) NOT NULL,
  `tour_group_name` varchar(255) NOT NULL,
  `adult_count` int NOT NULL DEFAULT '0',
  `child_count` int NOT NULL DEFAULT '0',
  `free_count` int NOT NULL DEFAULT '0',
  `currency` varchar(10) DEFAULT 'TL',
  `date` date DEFAULT NULL,
  `description` varchar(50) DEFAULT NULL,
  `regions` varchar(50) NOT NULL,
  `guide_ref` varchar(50) DEFAULT NULL,
  `guide_name` varchar(50) NOT NULL,
  `provider_name` varchar(255) DEFAULT NULL,
  `provider_ref` varchar(255) DEFAULT NULL,
  `time` varchar(10) DEFAULT NULL,
  `adult_price` decimal(10,2) DEFAULT NULL COMMENT 'Adult ticket price',
  `half_price` decimal(10,2) DEFAULT NULL COMMENT 'Half ticket price'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Tablo döküm verisi `reservation_tickets`
--

INSERT INTO `reservation_tickets` (`id`, `reservation_id`, `tour_name`, `tour_group_name`, `adult_count`, `child_count`, `free_count`, `currency`, `date`, `description`, `regions`, `guide_ref`, `guide_name`, `provider_name`, `provider_ref`, `time`, `adult_price`, `half_price`) VALUES
(131, 113, 'BLUE-DIVING', 'SCUBA-DIVING', 2, 1, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'blue diving', 'Z1YYRPWB', '08:10', 25.00, 20.00),
(132, 113, 'BUGGY-DBL-BLT', 'BUGGY-QUAD-AVSALLAR', 2, 0, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'bulent', 'BPBER7UP', '13:45', 30.00, 30.00),
(133, 113, 'RELAX-BOAT-CNT (öncelikli)', 'RELAX-BOAT', 1, 0, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'cuneyt', '56GXM39P', '17:30', 15.00, 7.00),
(134, 114, 'DIVING-DNZ-AL', 'SCUBA-DIVING', 2, 1, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'dennıs', 'AGUMTNDM', '09:00', 24.00, 12.50),
(135, 114, 'RELAX-BOAT-CNT (öncelikli)', 'RELAX-BOAT', 1, 2, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'cuneyt', '56GXM39P', '16:45', 15.00, 7.00),
(136, 115, 'BLUE-DIVING', 'SCUBA-DIVING', 2, 1, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'blue diving', 'Z1YYRPWB', '08:10', 25.00, 20.00),
(137, 115, 'BUGGY-DBL-BLT', 'BUGGY-QUAD-AVSALLAR', 2, 0, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'bulent', 'BPBER7UP', '13:45', 30.00, 30.00),
(138, 115, 'RELAX-BOAT-CNT (öncelikli)', 'RELAX-BOAT', 1, 0, 0, 'EUR', '2025-03-06', NULL, 'ALANYA', '567BTKYS', 'Şahin', 'cuneyt', '56GXM39P', '17:30', 15.00, 7.00);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ticket_options`
--

CREATE TABLE `ticket_options` (
  `id` int NOT NULL,
  `ticket_id` int NOT NULL,
  `option_name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dökümü yapılmış tablolar için indeksler
--

--
-- Tablo için indeksler `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reservations` (`company_id`);

--
-- Tablo için indeksler `reservation_payments`
--
ALTER TABLE `reservation_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Tablo için indeksler `reservation_tickets`
--
ALTER TABLE `reservation_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Tablo için indeksler `ticket_options`
--
ALTER TABLE `ticket_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ticket_id` (`ticket_id`);

--
-- Dökümü yapılmış tablolar için AUTO_INCREMENT değeri
--

--
-- Tablo için AUTO_INCREMENT değeri `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- Tablo için AUTO_INCREMENT değeri `reservation_payments`
--
ALTER TABLE `reservation_payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=169;

--
-- Tablo için AUTO_INCREMENT değeri `reservation_tickets`
--
ALTER TABLE `reservation_tickets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=139;

--
-- Tablo için AUTO_INCREMENT değeri `ticket_options`
--
ALTER TABLE `ticket_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- Dökümü yapılmış tablolar için kısıtlamalar
--

--
-- Tablo kısıtlamaları `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations` FOREIGN KEY (`company_id`) REFERENCES `companyusers` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `reservation_payments`
--
ALTER TABLE `reservation_payments`
  ADD CONSTRAINT `reservation_payments_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `reservation_tickets`
--
ALTER TABLE `reservation_tickets`
  ADD CONSTRAINT `reservation_tickets_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `ticket_options`
--
ALTER TABLE `ticket_options`
  ADD CONSTRAINT `ticket_options_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `reservation_tickets` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

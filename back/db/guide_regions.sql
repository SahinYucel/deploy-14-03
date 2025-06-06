CREATE TABLE IF NOT EXISTS guide_regions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guide_id INT NOT NULL,
  region_name VARCHAR(255) NOT NULL,
  FOREIGN KEY (guide_id) REFERENCES agencyguide(id) ON DELETE CASCADE,
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 
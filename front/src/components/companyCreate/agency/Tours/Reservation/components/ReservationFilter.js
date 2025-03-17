import React, { useState } from 'react';
import { Form, Row, Col, Button, Card } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import tr from 'date-fns/locale/tr';
import { addDays } from 'date-fns';
import "react-datepicker/dist/react-datepicker.css";

// Türkçe lokalizasyonu kaydet
registerLocale('tr', tr);

const ReservationFilter = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    customer_name: '',
    phone: '',
    hotel_name: '',
    room_number: '',
    guide_name: '',
    ticket_number: '',
    date: null,
    status: ''
  });

  // Filtreleme panelini varsayılan olarak kapalı göster
  const [showFilters, setShowFilters] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value // Boşlukları koruyarak değeri al
    }));
  };

  const handleDateChange = (date) => {
    setFilters(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Boş değerleri filtrele ve tarihi ISO formatına dönüştür
    const formattedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      // String değerler için boş kontrolü yap
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue !== '') {
          acc[key] = trimmedValue; // Filtreleme yaparken boşlukları temizle
        }
      } 
      // Tarih değeri için kontrol
      else if (key === 'date' && value) {
        acc[key] = value.toISOString().split('T')[0];
        acc['date_next'] = addDays(value, 1).toISOString().split('T')[0];
      }
      // Status değeri için kontrol
      else if (key === 'status' && value !== '') {
        acc[key] = value === 'active';
      }
      return acc;
    }, {});
    
    console.log('Filtreleme yapılıyor:', formattedFilters);
    onFilter(formattedFilters);
  };

  const handleReset = () => {
    setFilters({
      customer_name: '',
      phone: '',
      hotel_name: '',
      room_number: '',
      guide_name: '',
      ticket_number: '',
      date: null,
      status: ''
    });
    
    onFilter({});
  };

  return (
    <Card className="mb-4 reservation-filter-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Rezervasyon Filtreleri</span>
        <Button 
          variant="link" 
          onClick={() => setShowFilters(!showFilters)}
          className="p-0"
        >
          {showFilters ? 'Gizle' : 'Göster'}
        </Button>
      </Card.Header>
      
      {showFilters && (
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="align-items-end">
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Müşteri Adı</Form.Label>
                  <Form.Control
                    type="text"
                    name="customer_name"
                    value={filters.customer_name}
                    onChange={handleChange}
                    placeholder="Müşteri adı ara..."
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefon</Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={filters.phone}
                    onChange={handleChange}
                    placeholder="Telefon ara..."
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Bilet Numarası</Form.Label>
                  <Form.Control
                    type="text"
                    name="ticket_number"
                    value={filters.ticket_number}
                    onChange={handleChange}
                    placeholder="Bilet numarası ara..."
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3 date-picker-container">
                  <Form.Label>Oluşturma Tarihi</Form.Label>
                  <DatePicker
                    selected={filters.date}
                    onChange={handleDateChange}
                    dateFormat="dd/MM/yyyy"
                    locale="tr"
                    className="form-control"
                    placeholderText="Tarih seçin..."
                    isClearable
                    popperClassName="date-picker-popper"
                    popperPlacement="bottom-start"
                    popperModifiers={{
                      preventOverflow: {
                        enabled: true,
                      },
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="align-items-end">
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Otel</Form.Label>
                  <Form.Control
                    type="text"
                    name="hotel_name"
                    value={filters.hotel_name}
                    onChange={handleChange}
                    placeholder="Otel ara..."
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Oda Numarası</Form.Label>
                  <Form.Control
                    type="text"
                    name="room_number"
                    value={filters.room_number}
                    onChange={handleChange}
                    placeholder="Oda numarası ara..."
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Rehber</Form.Label>
                  <Form.Control
                    type="text"
                    name="guide_name"
                    value={filters.guide_name}
                    onChange={handleChange}
                    placeholder="Rehber ara..."
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Durum</Form.Label>
                  <Form.Select
                    name="status"
                    value={filters.status}
                    onChange={handleChange}
                  >
                    <option value="">Tümü</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col className="d-flex justify-content-end gap-2">
                <Button variant="primary" type="submit">
                  Filtrele
                </Button>
                <Button variant="secondary" type="button" onClick={handleReset}>
                  Sıfırla
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      )}
    </Card>
  );
};

export default ReservationFilter; 
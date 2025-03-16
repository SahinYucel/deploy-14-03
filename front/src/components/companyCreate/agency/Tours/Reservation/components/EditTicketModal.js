import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { registerLocale, setDefaultLocale } from 'react-datepicker';
import tr from 'date-fns/locale/tr';
import "react-datepicker/dist/react-datepicker.css";
import { getReservationRegions, getRegionTours, getTicketOptions, addTicketOption, deleteTicketOption } from '../../../../../../services/api';

// Türkçe lokalizasyonu kaydet
registerLocale('tr', tr);
setDefaultLocale('tr');

// Para birimleri listesi
const CURRENCIES = ['TL', 'USD', 'EUR', 'GBP'];

export default function EditTicketModal({ show, handleClose, ticket, handleSave }) {
  const [editedTicket, setEditedTicket] = useState({
    ...ticket,
    ticket_number: ticket?.ticket_number || '',
    rest_amounts: {  // Her para birimi için ayrı tutar
      TL: '',
      USD: '',
      EUR: '',
      GBP: ''
    },
    hour: '',
    minute: ''
  });

  const [tours, setTours] = useState([]);
  const [tourGroups, setTourGroups] = useState([]);
  const [regions, setRegions] = useState([]);
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState({
    option_name: '',
    price: ''
  });
  
  // Sadece bölgeleri yükle
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const regionsData = await getReservationRegions();
        setRegions(regionsData);

        // Eğer düzenlenen bilet varsa ve bölgesi seçiliyse, o bölgenin turlarını getir
        if (ticket?.regions) {
          const selectedRegions = ticket.regions.split(',');
          const responses = await Promise.all(selectedRegions.map(region => getRegionTours(region)));
          const allTours = responses.flat();
          const uniqueTours = allTours.filter((tour, index, self) =>
            index === self.findIndex((t) => t.id === tour.id)
          );
          
          // Grupları ayıkla
          const uniqueGroups = uniqueTours
            .filter(tour => tour.group_name)
            .reduce((groups, tour) => {
              if (!groups.find(g => g.group_name === tour.group_name)) {
                groups.push({
                  id: tour.main_tour_id,
                  group_name: tour.group_name
                });
              }
              return groups;
            }, []);
          
          // Eğer grup seçili ise sadece o grubun turlarını göster
          const filteredTours = ticket.tour_group_name 
            ? uniqueTours.filter(tour => tour.group_name === ticket.tour_group_name)
            : uniqueTours;
          
          setTours(filteredTours);
          setTourGroups(uniqueGroups);
        } else {
          // Eğer bilet yoksa veya bölge seçili değilse, turları ve grupları temizle
          setTours([]);
          setTourGroups([]);
        }
      } catch (error) {
        console.error('Bölgeler yüklenirken hata:', error);
      }
    };
    
    fetchRegions();
  }, [ticket]);

  // Modal kapandığında state'leri temizle
  useEffect(() => {
    if (!show) {
      setTours([]);
      setTourGroups([]);
    }
  }, [show]);

  // Modal açıldığında ticket verilerini güncelle
  useEffect(() => {
    if (show && ticket) {
      // "100 USD, 50 EUR" gibi string'i parse edelim
      const amounts = {};
      const amountPairs = (ticket.total_rest_amount || '').split(',').map(pair => pair.trim());
      
      // Varsayılan değerleri set et
      CURRENCIES.forEach(currency => {
        amounts[currency] = '';
      });

      // Gelen değerleri parse et
      amountPairs.forEach(pair => {
        const [amount, currency] = pair.split(' ');
        if (amount && currency) {
          amounts[currency] = amount;
        }
      });

      const [hour = '', minute = ''] = (ticket.time || '').split(':');

      setEditedTicket({
        ...ticket,
        date: ticket.date?.split('T')[0],
        adult_count: String(ticket.adult_count || 0),
        child_count: String(ticket.child_count || 0),
        free_count: String(ticket.free_count || 0),
        adult_price: String(ticket.adult_price || 0),
        child_price: String(ticket.half_price || 0),
        hour,
        minute,
        rest_amounts: amounts,
        status: ticket.status === 1
      });
    }
  }, [ticket, show]);

  // Opsiyonları yükle
  useEffect(() => {
    if (show && ticket?.id) {
      console.log('Fetching options for ticket ID:', ticket.id); // Debug için log
      getTicketOptions(ticket.id)
        .then(data => {
          console.log('Received options:', data); // Debug için log
          setOptions(data);
        })
        .catch(error => {
          console.error('Opsiyonlar yüklenirken hata:', error);
        });
    }
  }, [show, ticket]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'regions') {
      // Checkbox için bölge seçimi
      const currentRegions = editedTicket.regions ? editedTicket.regions.split(',') : [];
      let newRegions;
      
      if (checked) {
        newRegions = [...currentRegions, value].filter(Boolean);
      } else {
        newRegions = currentRegions.filter(region => region !== value);
      }

      // Eğer hiç bölge seçili değilse turları ve grupları temizle
      if (newRegions.length === 0) {
        setTours([]);
        setTourGroups([]);
        setEditedTicket(prev => ({
          ...prev,
          regions: '',
          tour_name: '',
          tour_group_name: ''
        }));
        return;
      }

      // Seçilen tüm bölgelere ait turları getir
      Promise.all(newRegions.map(region => getRegionTours(region)))
        .then(responses => {
          const allTours = responses.flat();
          const uniqueTours = allTours.filter((tour, index, self) =>
            index === self.findIndex((t) => t.id === tour.id)
          );
          
          // Grupları ayıkla
          const uniqueGroups = uniqueTours
            .filter(tour => tour.group_name)
            .reduce((groups, tour) => {
              if (!groups.find(g => g.group_name === tour.group_name)) {
                groups.push({
                  id: tour.main_tour_id,
                  group_name: tour.group_name
                });
              }
              return groups;
            }, []);
          
          setTours(uniqueTours);
          setTourGroups(uniqueGroups);
          
          setEditedTicket(prev => ({
            ...prev,
            regions: newRegions.join(','),
            tour_name: '',
            tour_group_name: ''
          }));
        })
        .catch(error => {
          console.error('Bölge turları yüklenirken hata:', error);
        });
    } else if (name === 'tour_group_name') {
      // Önce seçili bölgelerdeki tüm turları tekrar getir
      const selectedRegions = editedTicket.regions ? editedTicket.regions.split(',') : [];
      
      Promise.all(selectedRegions.map(region => getRegionTours(region)))
        .then(responses => {
          const allTours = responses.flat();
          const uniqueTours = allTours.filter((tour, index, self) =>
            index === self.findIndex((t) => t.id === tour.id)
          );
          
          // Seçilen gruba göre filtrele
          const filteredTours = value ? uniqueTours.filter(tour => tour.group_name === value) : uniqueTours;
          setTours(filteredTours);
          
          setEditedTicket(prev => ({
            ...prev,
            tour_group_name: value,
            tour_name: '',
            adult_price: '0',
            child_price: '0'
          }));
        })
        .catch(error => {
          console.error('Turlar yüklenirken hata:', error);
        });
    } else if (name === 'tour_name') {
      // Seçilen turun fiyat bilgilerini al
      const selectedTour = tours.find(tour => tour.name === value);
      
      if (selectedTour) {
        // Tur seçildiyse fiyatları güncelle
        setEditedTicket(prev => ({
          ...prev,
          tour_name: value,
          adult_price: String(selectedTour.price),
          child_price: String(selectedTour.child_price),
          currency: selectedTour.currency
        }));
      } else {
        // Tur seçimi kaldırıldıysa fiyatları sıfırla
        setEditedTicket(prev => ({
          ...prev,
          tour_name: '',
          adult_price: '0',
          child_price: '0'
        }));
      }
    } else if (name.startsWith('rest_amount_')) {
      // Para birimi tutarı değiştiğinde
      const currency = name.split('_')[2];
      setEditedTicket(prev => ({
        ...prev,
        rest_amounts: {
          ...prev.rest_amounts,
          [currency]: value
        }
      }));
    } else {
      setEditedTicket(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Boş olmayan tutarları birleştir
    const restAmountString = CURRENCIES
      .map(currency => {
        const amount = editedTicket.rest_amounts[currency];
        return amount ? `${amount} ${currency}` : null;
      })
      .filter(Boolean)
      .join(', ');

    const formattedTicket = {
      ...editedTicket,
      ticket_number: editedTicket.ticket_number,
      adult_count: parseInt(editedTicket.adult_count || 0),
      child_count: parseInt(editedTicket.child_count || 0),
      free_count: parseInt(editedTicket.free_count || 0),
      adult_price: parseFloat(editedTicket.adult_price || 0),
      half_price: parseFloat(editedTicket.child_price || 0),
      total_rest_amount: restAmountString,
      time: `${editedTicket.hour.padStart(2, '0')}:${editedTicket.minute.padStart(2, '0')}`
    };
    handleSave(formattedTicket);
  };

  // Bölge seçili mi kontrolü için yardımcı fonksiyon
  const isRegionSelected = (regionName) => {
    const selectedRegions = editedTicket.regions ? editedTicket.regions.split(',') : [];
    return selectedRegions.includes(regionName);
  };

  // Yeni opsiyon ekleme
  const handleAddOption = async () => {
    try {
      const response = await addTicketOption(ticket.id, newOption);
      
      if (response.optionId) {
        setOptions([...options, { ...newOption, id: response.optionId }]);
        setNewOption({
          option_name: '',
          price: ''
        });
      }
    } catch (error) {
      console.error('Opsiyon eklenirken hata:', error);
    }
  };

  // Opsiyon silme
  const handleDeleteOption = async (optionId) => {
    try {
      await deleteTicketOption(ticket.id, optionId);
      setOptions(options.filter(opt => opt.id !== optionId));
    } catch (error) {
      console.error('Opsiyon silinirken hata:', error);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Bilet Düzenle</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Bilet Numarası</Form.Label>
                <Form.Control
                  type="text"
                  name="ticket_number"
                  value={editedTicket.ticket_number}
                  onChange={handleChange}
                  placeholder="Bilet numarası girin"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Bölgeler</Form.Label>
                <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {regions.map((region) => (
                    <Form.Check
                      key={region.name}
                      type="checkbox"
                      id={`region-${region.name}`}
                      label={region.name}
                      name="regions"
                      value={region.name}
                      checked={isRegionSelected(region.name)}
                      onChange={handleChange}
                      className="mb-1"
                    />
                  ))}
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Grup</Form.Label>
                <Form.Select
                  name="tour_group_name"
                  value={editedTicket.tour_group_name || ''}
                  onChange={handleChange}
                >
                  <option value="">Grup Seçin</option>
                  {tourGroups.map((group) => (
                    <option key={group.id} value={group.group_name}>
                      {group.group_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Tur</Form.Label>
                <Form.Select
                  name="tour_name"
                  value={editedTicket.tour_name || ''}
                  onChange={handleChange}
                >
                  <option value="">Tur Seçin</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.name}>
                      {tour.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Tarih</Form.Label>
                <div className="w-100">
                  <DatePicker
                    selected={editedTicket.date ? new Date(editedTicket.date) : null}
                    onChange={(date) => {
                      handleChange({
                        target: {
                          name: 'date',
                          value: date ? date.toISOString().split('T')[0] : ''
                        }
                      });
                    }}
                    dateFormat="dd/MM/yyyy"
                    locale="tr"
                    className="form-control"
                    placeholderText="Tarih seçin"
                    wrapperClassName="w-100"
                    customInput={<Form.Control />}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Saat</Form.Label>
                <Row>
                  <Col md={6}>
                    <Form.Control
                      type="number"
                      name="hour"
                      value={editedTicket.hour}
                      onChange={handleChange}
                      placeholder="Saat"
                      min="0"
                      max="23"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Control
                      type="number"
                      name="minute"
                      value={editedTicket.minute}
                      onChange={handleChange}
                      placeholder="Dakika"
                      min="0"
                      max="59"
                    />
                  </Col>
                </Row>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Para Birimi</Form.Label>
                <Form.Select
                  name="currency"
                  value={editedTicket.currency || ''}
                  onChange={handleChange}
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Yetişkin</Form.Label>
                    <Form.Control
                      type="number"
                      name="adult_count"
                      value={editedTicket.adult_count || 0}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Çocuk</Form.Label>
                    <Form.Control
                      type="number"
                      name="child_count"
                      value={editedTicket.child_count || 0}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Ücretsiz</Form.Label>
                    <Form.Control
                      type="number"
                      name="free_count"
                      value={editedTicket.free_count || 0}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Yetişkin Fiyatı</Form.Label>
                <Form.Control
                  type="number"
                  name="adult_price"
                  value={editedTicket.adult_price || 0}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Çocuk Fiyatı</Form.Label>
                <Form.Control
                  type="number"
                  name="child_price"
                  value={editedTicket.child_price || 0}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rest Tutarlar</Form.Label>
                <Row>
                  {CURRENCIES.map((currency, index) => (
                    <Col md={6} key={currency}>
                      <div className="input-group mb-2">
                        <Form.Control
                          type="number"
                          name={`rest_amount_${currency}`}
                          value={editedTicket.rest_amounts[currency]}
                          onChange={handleChange}
                          placeholder={`${currency} tutarı`}
                        />
                        <span className="input-group-text">{currency}</span>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Açıklama</Form.Label>
                <Form.Control
                  as="textarea"
                  name="comment"
                  value={editedTicket.comment || ''}
                  onChange={handleChange}
                  placeholder="Bilet ile ilgili notlar..."
                  rows={3}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>İptal Açıklaması</Form.Label>
                <Form.Control
                  as="textarea"
                  name="cancellation_reason"
                  value={editedTicket.cancellation_reason || ''}
                  onChange={handleChange}
                  placeholder="İptal nedeni..."
                  rows={3}
                />
              </Form.Group>
            </Col>
            <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Aktif"
                  name="status"
                  checked={editedTicket.status}
                  onChange={handleChange}
                />
              </Form.Group>
          </Row>

          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label>Opsiyonlar</Form.Label>
              <div className="border rounded p-3 mb-3">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Opsiyon Adı</th>
                      <th>Fiyat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option) => (
                      <tr key={option.id}>
                        <td>{option.option_name}</td>
                        <td>{option.price} TL</td>
                        <td>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteOption(option.id)}
                          >
                            Sil
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3">
                  <Row>
                    <Col md={6}>
                      <Form.Control
                        placeholder="Opsiyon Adı"
                        value={newOption.option_name}
                        onChange={(e) => setNewOption({
                          ...newOption,
                          option_name: e.target.value
                        })}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="number"
                        placeholder="Fiyat (TL)"
                        value={newOption.price}
                        onChange={(e) => setNewOption({
                          ...newOption,
                          price: e.target.value
                        })}
                      />
                    </Col>
                    <Col md={2}>
                      <Button
                        variant="success"
                        onClick={handleAddOption}
                        disabled={!newOption.option_name || !newOption.price}
                      >
                        Ekle
                      </Button>
                    </Col>
                  </Row>
                </div>
              </div>
            </Form.Group>
          </Col>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            İptal
          </Button>
          <Button variant="primary" type="submit">
            Kaydet
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
} 
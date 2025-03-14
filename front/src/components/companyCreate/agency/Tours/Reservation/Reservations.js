import React, { useState, useEffect } from 'react';
import { Table, Tab, Tabs } from 'react-bootstrap';
import { getReservations, updateReservation, updateTicket } from '../../../../../services/api';
import EditReservationModal from './components/EditReservationModal';
import EditTicketModal from './components/EditTicketModal';
import ReservationRow from './components/ReservationRow';

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditReservation, setShowEditReservation] = useState(false);
  const [showEditTicket, setShowEditTicket] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const fetchReservations = async () => {
    try {
      const data = await getReservations();
      setReservations(data);
      setLoading(false);
    } catch (err) {
      setError('Rezervasyonlar yüklenirken bir hata oluştu');
      setLoading(false);
      console.error('Rezervasyon yükleme hatası:', err);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation);
    setShowEditReservation(true);
  };

  const handleEditTicket = (ticket, reservationId) => {
    setSelectedTicket({
      ...ticket,
      reservation_id: reservationId
    });
    setShowEditTicket(true);
  };

  const handleSaveReservation = async (editedReservation) => {
    try {
      await updateReservation(editedReservation.id, editedReservation);
      await fetchReservations();
      setShowEditReservation(false);
    } catch (error) {
      console.error('Rezervasyon güncelleme hatası:', error);
    }
  };

  const handleSaveTicket = async (editedTicket) => {
    try {
      await updateTicket(editedTicket.id, editedTicket);
      await fetchReservations();
      setShowEditTicket(false);
    } catch (error) {
      console.error('Bilet güncelleme hatası:', error);
    }
  };

  const handleStatusChange = async (reservationId, currentStatus) => {
    try {
      const updatedReservation = reservations.find(r => r.id === reservationId);
      await updateReservation(reservationId, {
        ...updatedReservation,
        status: !currentStatus
      });
      await fetchReservations();
    } catch (error) {
      console.error('Status güncelleme hatası:', error);
    }
  };

  // Rezervasyonları aktif ve iptal edilmiş olarak ayır
  const activeReservations = reservations.filter(r => r.status);
  const cancelledReservations = reservations.filter(r => !r.status);

  if (loading) return <div className="p-3">Yükleniyor...</div>;
  if (error) return <div className="p-3 text-danger">{error}</div>;

  return (
    <div className="p-5">
      <h5 className="mb-4">Rezervasyonlar</h5>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="active" title={`Aktif Rezervasyonlar (${activeReservations.length})`}>
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr align="center">
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}></th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Müşteri Adı</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Telefon</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Otel</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Oda No</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Rehber</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Bilet Sayısı</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Komisyon</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Oluşturma Tarihi</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Maliyet Ort</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Tahsilat</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Kurlar</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Durum</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {activeReservations.map((reservation) => (
                  <ReservationRow 
                    key={reservation.id} 
                    reservation={reservation}
                    onEditReservation={handleEditReservation}
                    onEditTicket={(ticket) => handleEditTicket(ticket, reservation.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </Table>
          </div>
        </Tab>

        <Tab eventKey="cancelled" title={`İptal Edilen Rezervasyonlar (${cancelledReservations.length})`}>
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr align="center">
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}></th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Müşteri Adı</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Telefon</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Otel</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Oda No</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Rehber</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Bilet Sayısı</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Komisyon</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Oluşturma Tarihi</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Maliyet Ort</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Tahsilat</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Kurlar</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>Durum</th>
                  <th style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {cancelledReservations.map((reservation) => (
                  <ReservationRow 
                    key={reservation.id} 
                    reservation={reservation}
                    onEditReservation={handleEditReservation}
                    onEditTicket={(ticket) => handleEditTicket(ticket, reservation.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </Table>
          </div>
        </Tab>
      </Tabs>

      {showEditReservation && selectedReservation && (
        <EditReservationModal
          show={showEditReservation}
          handleClose={() => setShowEditReservation(false)}
          reservation={selectedReservation}
          handleSave={handleSaveReservation}
          onEditTicket={(ticket) => handleEditTicket(ticket, selectedReservation.id)}
          allReservations={reservations}
        />
      )}

      {selectedTicket && (
        <EditTicketModal
          show={showEditTicket}
          handleClose={() => setShowEditTicket(false)}
          ticket={selectedTicket}
          handleSave={handleSaveTicket}
        />
      )}
    </div>
  );
} 
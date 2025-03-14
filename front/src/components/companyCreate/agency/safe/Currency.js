import React, { useState, useEffect } from 'react';
import { getCurrencyRates } from '../../../../services/api';

const Currency = () => {
  const [currencies, setCurrencies] = useState([
    { id: 1, code: 'EUR', name: 'Euro', symbol: '€', rate: 0, isBase: false },
    { id: 2, code: 'USD', name: 'US Dollar', symbol: '$', rate: 0, isBase: false },
    { id: 3, code: 'GBP', name: 'British Pound', symbol: '£', rate: 0, isBase: false },
    { id: 4, code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 0, isBase: false }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCurrencyRates();
      
      if (response.data.success && response.data.data) {
        const rates = response.data.data;
        
        const updatedCurrencies = currencies.map(currency => {
          const rate = rates[currency.code];
          if (!rate) return currency;

          return {
            ...currency,
            rate: rate.buying,
            name: rate.name
          };
        });

        setCurrencies(updatedCurrencies);
        setLastUpdate(response.data.lastUpdateTime);
      } else {
        throw new Error(response.data.message || 'Kur verileri alınamadı');
      }
    } catch (err) {
      console.error('Kurlar çekilirken hata:', err);
      let errorMessage = 'Kurlar güncellenirken bir hata oluştu';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 3600000); // 1 saat = 3600000 ms
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card mb-4">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-currency-exchange me-2"></i>
            Kur Ayarları
          </h5>
          <div className="d-flex align-items-center gap-3">
            {lastUpdate && (
              <small className="text-muted">
                <i className="bi bi-clock-history me-1"></i>
                Son Güncelleme: {new Date(lastUpdate).toLocaleString('tr-TR')}
              </small>
            )}
            <button 
              className="btn btn-sm btn-primary" 
              onClick={fetchExchangeRates}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Kurları Güncelle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Para Birimi</th>
                <th>Kod</th>
                <th>Sembol</th>
                <th>Alış Kuru</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map(currency => (
                <tr key={currency.id}>
                  <td>{currency.name}</td>
                  <td>{currency.code}</td>
                  <td>{currency.symbol}</td>
                  <td>{currency.rate.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Currency; 
import React from 'react'
import { formatPhoneNumber } from './companyUtils'

const CompanyForm = ({ formData, onInputChange, onSubmit }) => {
  return (
    <div className="row">
      <div className="col-md-5">
        <div className="mb-3">
          <label htmlFor="companyName" className="form-label">Şirket İsmi</label>
          <input 
            type="text"
            className="form-control"
            id="companyName"
            placeholder="Şirket ismini giriniz"
            value={formData.companyName}
            onChange={onInputChange}
          />
        </div>
      </div>
      <div className="col-md-5">
        <div className="mb-3">
          <label htmlFor="phoneNumber" className="form-label">Telefon</label>
          <div className="input-group">
            <span className="input-group-text">+90</span>
            <input 
              type="tel"
              className="form-control"
              id="phoneNumber"
              placeholder="5XX XXX XXXX"
              value={formData.phoneNumber}
              onChange={onInputChange}
              maxLength="12"
            />
          </div>
          <small className="text-muted">* Rehber bu telefonu ile iletişime geçmek amacıyla kullanıcak</small>
        </div>
      </div>
      <div className="col-md-2 d-flex p-2">
        <button className="btn btn-primary" onClick={onSubmit}>
          Şirket Ekle
        </button>
      </div>
    </div>
  )
}

export default CompanyForm 
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';


// Lazy load components
const DashboardHome = lazy(() => import('./DashboardHome'));
const Settings = lazy(() => import('./Settings'));
const RoleManagement = lazy(() => import('./RoleManagement'));
const Tours = lazy(() => import('./Tours/Tours'));
const TourAddToList = lazy(() => import('./Tours/TourAddToList'));
const DatabaseBackup = lazy(() => import('./DatabaseBackup'));
const Companies = lazy(() => import('./companies/Companies'));
const Safe = lazy(() => import('./safe/Safe'));
const Collection = lazy(() => import('./safe/Collection/Collection'));
const Reservations = lazy(() => import('./Tours/Reservation/Reservations'));
const Guides = lazy(() => import('./guides/Guides'));
// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center p-5">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Yükleniyor...</span>
    </div>
  </div>
);

function MenuSliderRoute({ company, subscription, setIsLoggedIn }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<DashboardHome company={company} subscription={subscription} setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="definitions">
          <Route path="companies" element={<Companies />} />
          <Route path="guides" element={<Guides />} />
          <Route path="tours">
            <Route index element={<Tours />} />
            <Route path="create" element={<Tours />} />
            <Route path="lists" element={<TourAddToList />} />
          </Route>
        </Route>
        <Route path="reservations" element={<Reservations />} />

        <Route path="reports" element={<div>Raporlar (Yakında)</div>} />
        <Route path="safe">
          <Route index element={<Safe />} />
          <Route path="collection" element={<Collection />} />
        </Route>
        <Route path="settings" element={<Settings company={company} />} />
        <Route path="role-management" element={<RoleManagement company={company} />} />
        <Route path="database-backup" element={<DatabaseBackup />} />
      </Routes>
    </Suspense>
  );
}

export default MenuSliderRoute; 
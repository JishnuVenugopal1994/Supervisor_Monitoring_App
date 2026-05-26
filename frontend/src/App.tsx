import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import ResourcesPage from './pages/ResourcesPage';
import MaterialsPage from './pages/MaterialsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/board" element={<BoardPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

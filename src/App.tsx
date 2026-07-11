import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { NewPermitPage } from './pages/NewPermitPage'
import { PermitDetailPage } from './pages/PermitDetailPage'
import { PprPage } from './pages/PprPage'
import { RiskAssessmentPage } from './pages/RiskAssessmentPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { CertificatesPage } from './pages/CertificatesPage'
import { HelpPage } from './pages/HelpPage'
import { AdminPanelPage } from './pages/AdminPanelPage'
import { HomeRoute } from './pages/HomeRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route path="ppr" element={<PprPage />} />
        <Route path="new" element={<NewPermitPage />} />
        <Route path="risk-assessment" element={<RiskAssessmentPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="p/:id" element={<PermitDetailPage />} />
        <Route path="matrix" element={<Navigate to="/" replace />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="admin" element={<AdminPanelPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { MatrixPage } from './pages/MatrixPage'
import { NewPermitPage } from './pages/NewPermitPage'
import { PermitDetailPage } from './pages/PermitDetailPage'
import { PermitListPage } from './pages/PermitListPage'
import { PprPage } from './pages/PprPage'
import { RiskAssessmentPage } from './pages/RiskAssessmentPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { CertificatesPage } from './pages/CertificatesPage'
import { HelpPage } from './pages/HelpPage'

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
        <Route index element={<PermitListPage />} />
        <Route path="ppr" element={<PprPage />} />
        <Route path="new" element={<NewPermitPage />} />
        <Route path="risk-assessment" element={<RiskAssessmentPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="p/:id" element={<PermitDetailPage />} />
        <Route path="matrix" element={<MatrixPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

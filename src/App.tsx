import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import CollecteurPage from './pages/CollecteurPage'
import DraftPage from './pages/DraftPage'
import EquipePage from './pages/EquipePage'
import JoueursPage from './pages/JoueursPage'
import ScoutingPage from './pages/ScoutingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<EquipePage />} />
          <Route path="joueurs" element={<JoueursPage />} />
          <Route path="scouting" element={<ScoutingPage />} />
          <Route path="draft" element={<DraftPage />} />
          <Route path="collecteur" element={<CollecteurPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

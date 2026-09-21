
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SubjectsPage } from './pages/SubjectsPage'
import { LoginPage } from './pages/LoginPage'
import { EnrollmentsPage } from './pages/EnrollmentsPage'
import { StudentsPage } from './pages/StudentsPage'
import { InvoicePage } from './pages/InvoicePage'

function App() {

  return (
    <Router>
      <Routes>
        {/*Rutas con el layout de secretaria (esto solo es para pruebas visuales) */}
        <Route path='/' element={<Layout />}>
          <Route path='materias' element={<SubjectsPage />} />
          <Route path='inscripciones' element={<EnrollmentsPage />} />
          <Route path='alumnos' element={<StudentsPage />} />
          <Route path='facturacion' element={<InvoicePage />} />
        </Route>

        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </Router>
  )
}

export default App

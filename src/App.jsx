import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SubjectsPage } from './pages/SubjectsPage';
import { LoginPage } from './pages/LoginPage';
import { EnrollmentsPage } from './pages/EnrollmentsPage';
import { StudentsPage } from './pages/StudentsPage';
import { InvoicePage } from './pages/InvoicePage';
import { DashboardPage } from './pages/DashboardPage';
import { NewEnrollmentPage } from './pages/NewEnrollmentPage';
import { DashboardPageTeacher } from './pages/profesores/DashboardPageTeacher';
import { MisMateriasPage } from './pages/profesores/MisMateriasPage';
import { GestionExamenesPage } from './pages/profesores/GestionDeExamenesPage';
import { DetalleMateriaPage } from './pages/profesores/DetalleMateriaPage';
import { SeleccionMateriaExamenPage } from './pages/profesores/SeleccionMateriaExamenPage';
import { CalificarExamenPage } from './pages/profesores/CalificarExamenPage';
import { ResultadosExamenPage } from './pages/profesores/ResultadosExamenPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route path='/' element={<DashboardPage />} />
          <Route path='materias' element={<SubjectsPage />} />
          <Route path='inscripciones' element={<EnrollmentsPage />} />
          <Route path='alumnos' element={<StudentsPage />} />
          <Route path='facturacion' element={<InvoicePage />} />
          <Route path='inscripciones/nueva' element={<NewEnrollmentPage />} />
          
          {/* Rutas del Módulo de Profesor */}
          <Route path='profesor/dashboard' element={<DashboardPageTeacher />} />
          <Route path='materias/mis-materias' element={<MisMateriasPage />} />
          <Route path='materias/examenes' element={<SeleccionMateriaExamenPage />} />
          <Route path='materias/examenes/:materiaId' element={<GestionExamenesPage />} />
          <Route path='materias/:materiaId' element={<DetalleMateriaPage />} />
          <Route path='materias/examenes/:materiaId/calificar' element={<CalificarExamenPage />} />
          <Route path='materias/examenes/:materiaId/resultados/:examenId' element={<ResultadosExamenPage />} />
        </Route>

        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
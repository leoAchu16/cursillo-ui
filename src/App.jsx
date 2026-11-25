import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { Layout } from './components/Layout';
import { authService } from './services/authService';
import { SubjectsPage } from './pages/SubjectsPage';
import { LoginPage } from './pages/LoginPage';
import { EnrollmentsPage } from './pages/EnrollmentsPage';
import { StudentsPage } from './pages/StudentsPage';
import { DashboardPageSecretary } from './pages/DashboardPageSecretary';
import { NewEnrollmentPage } from './pages/NewEnrollmentPage';
import { DashboardPageTeacher } from './pages/profesores/DashboardPageTeacher';
import { MisMateriasPage } from './pages/profesores/MisMateriasPage';
import { GestionExamenesPage } from './pages/profesores/GestionDeExamenesPage';
import { DetalleMateriaPage } from './pages/profesores/DetalleMateriaPage';
import { SeleccionMateriaExamenPage } from './pages/profesores/SeleccionMateriaExamenPage';
import { CalificarExamenPage } from './pages/profesores/CalificarExamenPage';
import { ResultadosExamenPage } from './pages/profesores/ResultadosExamenPage';
import { FacturasPage } from './pages/facturacion/FacturasPage';
import { NuevaFacturaPage } from './pages/facturacion/NuevaFacturaPage';
import { ConceptosPage } from './pages/facturacion/ConceptosPage';
import { DashboardPageAlumno } from './pages/alumnos/DashboardPage';
import { MisMateriasAlumnoPage } from './pages/alumnos/MisMateriasPage';
import { MisExamenesPage } from './pages/alumnos/MisExamenesPage';

// En "/" está el panel de secretaría: los demás roles van a su propia página de inicio
const Inicio = () => {
  const ruta = authService.getRutaInicio();
  return ruta === '/' ? <DashboardPageSecretary /> : <Navigate to={ruta} replace />;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path='/' element={<Layout />}>

          {/* Rutas del Módulo de Secretaría */}
          <Route path='/' element={<Inicio />} />
          <Route path='materias' element={<SubjectsPage />} />
          <Route path='inscripciones' element={<EnrollmentsPage />} />
          <Route path='alumnos' element={<StudentsPage />} />
          <Route path='inscripciones/nueva' element={<NewEnrollmentPage />} />
          <Route path='facturas' element={<FacturasPage />} />
          <Route path='facturas/nueva' element={<NuevaFacturaPage />} />
          <Route path='conceptos' element={<ConceptosPage />} />

          {/* Rutas del Módulo de Profesor */}
          <Route path='profesor/dashboard' element={<DashboardPageTeacher />} />
          <Route path='materias/mis-materias' element={<MisMateriasPage />} />
          <Route path='materias/examenes' element={<SeleccionMateriaExamenPage />} />
          <Route path='materias/examenes/:materiaId' element={<GestionExamenesPage />} />
          <Route path='materias/:materiaId' element={<DetalleMateriaPage />} />
          <Route path='materias/examenes/:materiaId/calificar' element={<CalificarExamenPage />} />
          <Route path='materias/examenes/:materiaId/resultados/:examenId' element={<ResultadosExamenPage />} />

          {/* Rutas del Módulo de Alumno */}
          <Route path='alumno/tablero' element={<DashboardPageAlumno />} />
          <Route path='alumno/mis-materias' element={<MisMateriasAlumnoPage />} />
          <Route path='alumno/mis-examenes' element={<MisExamenesPage />} />



        </Route>

        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
import { SearchInput } from "../components/SearchInput"
import { SegmentedControl } from "../components/SegmentedControl"
import { useState } from "react"

export const NewEnrollmentPage = () => {

    const [seccion, setSeccion] = useState("subject");

    const options = [
        { label: 'Materia', value: 'subject' },
        { label: 'Exámen', value: 'exam' }
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col">
                <button
                    onClick={() => window.history.back()}
                    className="self-start w-auto transition-colors cursor-pointer hover:text-(--btnColor-primary)">
                    <i className="icon-[heroicons--arrow-left] mr-2"></i>
                    Volver
                </button>
                <h1>Inscripciones / <span className="text-[18px] text-gray-700">Nueva inscripción</span></h1>
                <h2>Gestión de inscripciones de alumnos a materias o exámenes</h2>
            </div>
            <div className="card">
                <h3>Datos del Alumno</h3>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label>Alumno</label>
                        <SearchInput variant="default" placeholder="Buscar alumno..." />
                    </div>
                    <div>
                        <label>Nro. de cédula de identidad</label>
                        <input type="number" placeholder="12345678" />
                    </div>
                    <div>
                        <label>Correo electrónico</label>
                        <input type="email" placeholder="fulano@gmail.com" />
                    </div>
                </div>
            </div>
            <div className="card">
                <div className="flex flex-row justify-between">
                    <h3>Agregar Item</h3>
                    <SegmentedControl
                        value={seccion}
                        onChange={setSeccion}
                        options={options}
                    />
                </div>
                <div>
                    <label>Materia</label>
                    <input type="checkbox" placeholder="Seleccionar materia" ></input>
                </div>
            </div>
        </div>
    )
}
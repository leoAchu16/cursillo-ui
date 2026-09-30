
import { SegmentedControl } from "../components/SegmentedControl"
import { Combobox } from "../components/Combobox"
import { useState } from "react"
import { Table } from "../components/Table"

export const NewEnrollmentPage = () => {

    const [seccion, setSeccion] = useState("subject");
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedExam, setSelectedExam] = useState(null);

    const options = [
        { label: 'Materia', value: 'subject' },
        { label: 'Exámen', value: 'exam' }
    ];

    const students = [
        { label: 'Juan Perez', value: 'juan-perez' },
        { label: 'Maria Lopez', value: 'maria-lopez' },
        { label: 'Carlos Rodriguez', value: 'carlos-rodriguez' },
        { label: 'Ana Garcia', value: 'ana-garcia' },
        { label: 'Pedro Ramirez', value: 'pedro-ramirez' },
        { label: 'Miguel Sanchez', value: 'miguel-sanchez' }
    ]

    const subjects = [
        { label: 'Matematica', value: 'matematica' },
        { label: 'Fisica', value: 'fisica' },
        { label: 'Quimica', value: 'quimica' },
        { label: 'Biologia', value: 'biologia' },
        { label: 'Informatica', value: 'informatica' },
        { label: 'Guarani', value: 'guarani' }
    ]

    const exams = [
        { label: 'Parcial Matematicas', value: 'exam-1' },
        { label: 'Final Programacion', value: 'exam-2' },
        { label: 'Final Quimica', value: 'exam-3' },
        { label: 'Final Fisica', value: 'exam-4' },
        { label: 'Final Guarani', value: 'exam-5' }
    ]

    const headers = ['Tipo inscripcion', 'Materia', 'Dia/Hora', 'Costo (Gs.)', 'Acciones'];

    const enrollments = [
        ['MATERIA', 'Matematica', '14/08/2026 - 14:00', 'Gs. 100000'],
        ['EXAMEN', 'Final Programacion', '15/08/2026 - 16:00', 'Gs. 150000'],
        ['MATERIA', 'Fisica', '14/08/2026 - 16:00', 'Gs. 100000']
    ]


    const tableActions = [
        {
            type: 'delete',
            onClick: (row) => console.log('Eliminando: ', row)
        }
    ]

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
            <div className="grid grid-cols-2 gap-3">
                <div className="card">
                    <h3>Datos del Alumno</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-row gap-8">
                            <div className="flex flex-col gap-2">
                                <label>Alumno</label>
                                <Combobox
                                    options={students}
                                    value={selectedStudent}
                                    onChange={setSelectedStudent}
                                    placeholder="Buscar alumno..."
                                    className="w-64" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label>Nro. de cédula de identidad</label>
                                <input className="w-32" type="number" placeholder="12345678" />
                            </div>
                        </div>
                        <div>
                            <label>Correo electrónico</label>
                            <input type="email" placeholder="fulano@gmail.com" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-wrap gap-3">
                            <h3>Agregar Item</h3>
                            <div className="flex flex-col gap-2">
                                <label>{seccion === "subject" ? "Materia" : "Exámen"}</label>
                                <Combobox
                                    options={seccion === 'subject' ? subjects : exams}
                                    value={seccion === 'subject' ? selectedSubject : selectedExam}
                                    onChange={seccion === 'subject' ? setSelectedSubject : setSelectedExam}
                                    placeholder={`Seleccionar ${seccion === 'subject' ? 'materia' : 'exámen'}...`}
                                    className="w-64"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label>Costo(Gs.)</label>
                                <input type="number" />
                            </div>

                        </div>

                        <div className="flex flex-col w-full items-end justify-between">
                            <SegmentedControl
                                value={seccion}
                                onChange={setSeccion}
                                options={options}
                            />
                            <button
                                className="flex items-center w-fit bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 px-5 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer">
                                <i className="icon-[heroicons--plus] text-white mr-2"></i>Agregar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card">
                <h3>Lista de inscripciones</h3>
                <Table headers={headers} data={enrollments} actions={tableActions} />
            </div>
        </div>
    )
}
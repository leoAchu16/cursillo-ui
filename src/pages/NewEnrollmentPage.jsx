import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SegmentedControl } from "../components/SegmentedControl";
import { Combobox } from "../components/Combobox";
import { Table } from "../components/Table";
import { listarMaterias, listarExamenesPorMateria } from "../services/notasService";
import { crearInscripcion, listarAlumnos } from "../services/inscripcionesService";
import api from "../services/api";

export const NewEnrollmentPage = () => {
    const navigate = useNavigate();

    // Tipo de item a agregar: 'subject' (Materia) | 'exam' (Examen)
    const [seccion, setSeccion] = useState("subject");

    // Selección actual en el formulario de items
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [itemCosto, setItemCosto] = useState("");

    // Datos del Alumno
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentIdInput, setStudentIdInput] = useState("");
    const [studentNombre, setStudentNombre] = useState("");
    const [studentCedula, setStudentCedula] = useState("");
    const [studentEmail, setStudentEmail] = useState("");

    // Opciones cargadas
    const [studentOptions, setStudentOptions] = useState([]);
    const [subjectOptions, setSubjectOptions] = useState([]);
    const [examOptions, setExamOptions] = useState([]);

    // Lista de items agregados a la inscripción
    const [itemsInscripcion, setItemsInscripcion] = useState([]);

    // Estados de interfaz y feedback
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formItemError, setFormItemError] = useState(null);

    const seccionOptions = [
        { label: "Materia", value: "subject" },
        { label: "Exámen", value: "exam" }
    ];

    // Cargar materias, exámenes y alumnos disponibles
    useEffect(() => {
        const cargarDatosIniciales = async () => {
            setLoadingData(true);
            try {
                // 1. Cargar Alumnos
                try {
                    const alumnosData = await listarAlumnos();
                    const listaAlumnos = Array.isArray(alumnosData)
                        ? alumnosData
                        : alumnosData?.content || [];

                    const formateados = listaAlumnos.map((a) => {
                        const id = a.id || a.idAlumno;
                        const nombre = a.nombre ? `${a.nombre} ${a.apellido || ""}`.trim() : a.nombreCompleto || `Alumno #${id}`;
                        return {
                            label: `${nombre} (ID: ${id})`,
                            value: id,
                            nombre,
                            ci: a.ci || a.cedula || a.documento || "",
                            email: a.email || a.correo || ""
                        };
                    });
                    setStudentOptions(formateados);
                } catch (err) {
                    console.error("Error al cargar alumnos:", err);
                    setStudentOptions([]);
                }

                // 2. Cargar Materias
                let materiasList = [];
                try {
                    const dataMaterias = await listarMaterias();
                    materiasList = Array.isArray(dataMaterias)
                        ? dataMaterias
                        : dataMaterias?.content || dataMaterias?.data || [];

                    const matsFormateadas = materiasList.map((m) => {
                        const id = m.id || m.idMateria;
                        const nombre = m.nombre || m.nombreMateria || `Materia #${id}`;
                        const horario = m.horario || m.dia || "Horario regular";
                        const costo = Number(m.costo || m.precio || 100000);
                        return {
                            label: `${nombre} — ${horario} (Gs. ${costo.toLocaleString("es-PY")})`,
                            value: id,
                            nombre,
                            horario,
                            costo
                        };
                    });
                    setSubjectOptions(matsFormateadas);
                } catch (err) {
                    console.error("Error al cargar materias:", err);
                    setSubjectOptions([]);
                }

                // 3. Cargar Exámenes
                let examenesList = [];
                try {
                    const resp = await api.get("/examenes");
                    examenesList = Array.isArray(resp.data) ? resp.data : resp.data?.content || [];
                } catch {
                    if (materiasList.length > 0) {
                        try {
                            const promesas = materiasList.map((m) =>
                                listarExamenesPorMateria(m.id || m.idMateria).catch(() => [])
                            );
                            const resListas = await Promise.all(promesas);
                            examenesList = resListas.flat().filter(Boolean);
                        } catch (err) {
                            console.error("Error al cargar examenes por materia:", err);
                            examenesList = [];
                        }
                    }
                }

                const examsFormateados = examenesList.map((e) => {
                    const id = e.id || e.idExamen;
                    const nombre = e.nombre || e.titulo || e.descripcion || `Examen #${id}`;
                    const horario = e.fecha ? `Fecha: ${e.fecha}` : "Fecha programada";
                    const costo = Number(e.costo || e.precio || 150000);
                    return {
                        label: `${nombre} — ${horario} (Gs. ${costo.toLocaleString("es-PY")})`,
                        value: id,
                        idMateria: e.idMateria || null,
                        nombre,
                        horario,
                        costo
                    };
                });
                setExamOptions(examsFormateados);

            } catch (errGeneral) {
                console.error("Error general al cargar datos iniciales:", errGeneral);
            } finally {
                setLoadingData(false);
            }
        };

        cargarDatosIniciales();
    }, []);

    // Manejar selección de un alumno
    const handleSelectStudent = (val) => {
        setSelectedStudentId(val);
        if (val) {
            const alumno = studentOptions.find((s) => s.value === val);
            if (alumno) {
                setStudentIdInput(String(alumno.value));
                setStudentNombre(alumno.nombre || alumno.label);
                setStudentCedula(alumno.ci || "");
                setStudentEmail(alumno.email || "");
            }
        }
    };

    const handleStudentIdInputChange = (e) => {
        const nuevoId = e.target.value;
        setStudentIdInput(nuevoId);
        const num = Number(nuevoId);
        const match = studentOptions.find((s) => s.value === num);
        if (match) {
            setSelectedStudentId(match.value);
            setStudentNombre(match.nombre || match.label);
            setStudentCedula(match.ci || "");
            setStudentEmail(match.email || "");
        } else {
            setSelectedStudentId(null);
            setStudentNombre("");
            setStudentCedula("");
            setStudentEmail("");
        }
    };

    const handleSelectSubject = (id) => {
        setSelectedSubjectId(id);
        const mat = subjectOptions.find((s) => s.value === id);
        if (mat) {
            setItemCosto(String(mat.costo));
        }
        setFormItemError(null);
    };

    const handleSelectExam = (id) => {
        setSelectedExamId(id);
        const ex = examOptions.find((e) => e.value === id);
        if (ex) {
            setItemCosto(String(ex.costo));
        }
        setFormItemError(null);
    };

    const handleAddItem = (e) => {
        e?.preventDefault();
        setFormItemError(null);

        if (seccion === "subject") {
            if (!selectedSubjectId) {
                setFormItemError("Debes seleccionar una materia para agregar.");
                return;
            }
            const mat = subjectOptions.find((s) => s.value === selectedSubjectId);
            const costoNum = Number(itemCosto) || mat.costo;

            const nuevoItem = {
                idLocal: Date.now() + Math.random(),
                tipo: "MATERIA",
                idMateria: mat.value,
                idExamen: null,
                nombre: mat.nombre,
                horario: mat.horario,
                costo: costoNum
            };

            setItemsInscripcion((prev) => [...prev, nuevoItem]);
            setSelectedSubjectId(null);
            setItemCosto("");
        } else {
            if (!selectedExamId) {
                setFormItemError("Debes seleccionar un examen para agregar.");
                return;
            }
            const ex = examOptions.find((e) => e.value === selectedExamId);
            const costoNum = Number(itemCosto) || ex.costo;

            const nuevoItem = {
                idLocal: Date.now() + Math.random(),
                tipo: "EXAMEN",
                idMateria: ex.idMateria || null,
                idExamen: ex.value,
                nombre: ex.nombre,
                horario: ex.horario,
                costo: costoNum
            };

            setItemsInscripcion((prev) => [...prev, nuevoItem]);
            setSelectedExamId(null);
            setItemCosto("");
        }
    };

    const handleRemoveItem = (itemRow) => {
        const idLocal = itemRow._idLocal;
        setItemsInscripcion((prev) => prev.filter((it) => it.idLocal !== idLocal));
    };

    const totalCosto = itemsInscripcion.reduce((acc, curr) => acc + (Number(curr.costo) || 0), 0);

    const handleSubmitInscripcion = async () => {
        setError(null);

        const finalIdAlumno = Number(studentIdInput);
        if (!finalIdAlumno || isNaN(finalIdAlumno) || finalIdAlumno <= 0) {
            setError("Debes indicar un ID de Alumno válido.");
            return;
        }

        if (itemsInscripcion.length === 0) {
            setError("Debes agregar al menos una materia o examen a la inscripción.");
            return;
        }

        // Construir el DTO asegurando el campo 'tipoInscripcion' para Spring Boot
        const detallesFormateados = itemsInscripcion.map((it) => ({
            tipoInscripcion: it.tipo, // <-- CORRECCIÓN APLICADA AQUÍ
            costo: Number(it.costo) || 0,
            ...(it.tipo === "MATERIA" ? { idMateria: Number(it.idMateria) } : {}),
            ...(it.tipo === "EXAMEN" ? { idExamen: Number(it.idExamen), idMateria: it.idMateria ? Number(it.idMateria) : undefined } : {})
        }));

        const dto = {
            idAlumno: finalIdAlumno,
            idSecretaria: 5, // Puedes cambiar esto para que tome el ID real de la secretaria autenticada
            detallesInscripcion: detallesFormateados
        };

        setSubmitting(true);
        try {
            await crearInscripcion(dto);
            navigate("/inscripciones", {
                state: {
                    mensajeExito: `¡Inscripción para el alumno #${finalIdAlumno} registrada con éxito!`
                }
            });
        } catch (err) {
            console.error("Error al enviar inscripción:", err);
            const msg = err.response?.data?.message || err.message;
            setError(msg || "Error al procesar la inscripción en el servidor.");
        } finally {
            setSubmitting(false);
        }
    };

    const headersTable = ["Tipo inscripción", "Materia / Examen", "Día / Horario", "Costo (Gs.)", "Acciones"];

    const dataTable = itemsInscripcion.map((item) => {
        const row = [
            item.tipo,
            item.nombre,
            item.horario,
            `Gs. ${Number(item.costo).toLocaleString("es-PY")}`
        ];
        row._idLocal = item.idLocal;
        return row;
    });

    const tableActions = [
        {
            type: "delete",
            title: "Quitar de la lista",
            onClick: handleRemoveItem
        }
    ];

    if (loadingData) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Cargando datos...</p>
            </div>
        )
    }

    return (
        <div className="container-page">
            <div className="flex flex-col">
                <button
                    type="button"
                    onClick={() => navigate("/inscripciones")}
                    className="self-start w-auto transition-colors cursor-pointer hover:text-(--btnColor-primary) flex items-center text-sm font-semibold mb-1"
                >
                    <i className="icon-[heroicons--arrow-left] mr-1.5 text-base"></i>
                    Volver a Inscripciones
                </button>
                <h1>Inscripciones / <span className="text-[18px] text-gray-700">Nueva inscripción</span></h1>
                <h2>Gestión de inscripciones de alumnos a materias o exámenes</h2>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <i className="icon-[heroicons--exclamation-circle] text-rose-600 text-xl shrink-0"></i>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-rose-700 hover:text-rose-900 cursor-pointer"
                    >
                        <i className="icon-[heroicons--x-mark] text-lg"></i>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TARJETA 1: DATOS DEL ALUMNO */}
                <div className="card">
                    <div className="flex justify-between items-center mb-1">
                        <h3>Datos del Alumno</h3>
                        <span className="text-xs text-gray-500">ID requerido por backend</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Seleccionar Alumno</label>
                                <Combobox
                                    options={studentOptions}
                                    value={selectedStudentId}
                                    onChange={handleSelectStudent}
                                    placeholder="Buscar alumno..."
                                    className="w-full"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                    ID Alumno <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    className="w-full border rounded p-2"
                                    type="number"
                                    min="1"
                                    placeholder="Ej: 1"
                                    value={studentIdInput}
                                    onChange={handleStudentIdInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Nro. de Cédula</label>
                                <input
                                    className="w-full border rounded p-2 bg-gray-50"
                                    type="text"
                                    placeholder="1234567"
                                    value={studentCedula}
                                    readOnly
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Correo Electrónico</label>
                                <input
                                    className="w-full border rounded p-2 bg-gray-50"
                                    type="email"
                                    placeholder="alumno@ejemplo.com"
                                    value={studentEmail}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: AGREGAR ITEM */}
                <div className="card flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3>Agregar Item</h3>
                            <SegmentedControl
                                value={seccion}
                                onChange={(val) => {
                                    setSeccion(val);
                                    setFormItemError(null);
                                }}
                                options={seccionOptions}
                            />
                        </div>

                        {formItemError && (
                            <p className="text-xs text-rose-600 mb-2 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                                {formItemError}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                    {seccion === "subject" ? "Materia a inscribir" : "Examen a inscribir"}
                                </label>
                                <Combobox
                                    options={seccion === "subject" ? subjectOptions : examOptions}
                                    value={seccion === "subject" ? selectedSubjectId : selectedExamId}
                                    onChange={seccion === "subject" ? handleSelectSubject : handleSelectExam}
                                    placeholder={`Seleccionar ${seccion === "subject" ? "materia" : "examen"}...`}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Costo (Gs.)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="5000"
                                    placeholder="100000"
                                    value={itemCosto}
                                    onChange={(e) => setItemCosto(e.target.value)}
                                    className="w-full border rounded p-2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="flex items-center bg-blue-600 text-white rounded-xl p-2 px-5 shadow-sm hover:bg-blue-700 transition-colors cursor-pointer text-sm font-semibold"
                        >
                            <i className="icon-[heroicons--plus] text-white mr-1.5 text-base"></i>
                            Agregar a la lista
                        </button>
                    </div>
                </div>
            </div>

            {/* TARJETA 3: LISTA DE ITEMS A INSCRIBIR Y CONFIRMACIÓN */}
            <div className="card flex flex-col gap-4 mt-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3>Items de la Inscripción</h3>
                        <p className="text-xs text-gray-500">
                            {itemsInscripcion.length} {itemsInscripcion.length === 1 ? "elemento agregado" : "elementos agregados"}
                        </p>
                    </div>

                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold block">Total a Facturar</span>
                        <span className="text-xl font-extrabold text-blue-600">
                            Gs. {totalCosto.toLocaleString("es-PY")}
                        </span>
                    </div>
                </div>

                <Table
                    headers={headersTable}
                    data={dataTable}
                    actions={tableActions}
                    showPagination={false}
                />

                <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button
                        type="button"
                        disabled={submitting || itemsInscripcion.length === 0}
                        onClick={handleSubmitInscripcion}
                        className={`flex items-center px-6 py-2 rounded-xl text-white font-semibold text-sm shadow-md transition-all ${submitting || itemsInscripcion.length === 0
                            ? "bg-slate-300 cursor-not-allowed shadow-none"
                            : "bg-green-600 hover:bg-green-700 cursor-pointer"
                            }`}
                    >
                        {submitting ? "Guardando..." : "Confirmar Inscripción"}
                    </button>
                </div>
            </div>
        </div>
    );
};
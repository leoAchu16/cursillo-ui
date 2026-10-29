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

    // Alumnos predeterminados como fallback si el microservicio aún no expone /alumnos
    const defaultStudents = [
        { label: "Juan Perez (ID: 1)", value: 1, nombre: "Juan Perez", ci: "4567890", email: "juan.perez@cursillo.py" },
        { label: "Maria Lopez (ID: 2)", value: 2, nombre: "Maria Lopez", ci: "5123456", email: "maria.lopez@cursillo.py" },
        { label: "Carlos Rodriguez (ID: 3)", value: 3, nombre: "Carlos Rodriguez", ci: "3987654", email: "carlos.rodriguez@cursillo.py" },
        { label: "Ana Garcia (ID: 4)", value: 4, nombre: "Ana Garcia", ci: "4876123", email: "ana.garcia@cursillo.py" },
        { label: "Pedro Ramirez (ID: 5)", value: 5, nombre: "Pedro Ramirez", ci: "6234891", email: "pedro.ramirez@cursillo.py" },
        { label: "Miguel Sanchez (ID: 6)", value: 6, nombre: "Miguel Sanchez", ci: "5432109", email: "miguel.sanchez@cursillo.py" }
    ];

    // Cargar materias, exámenes y alumnos disponibles
    useEffect(() => {
        const cargarDatosIniciales = async () => {
            setLoadingData(true);
            try {
                // 1. Cargar Alumnos (intenta endpoint real o usa default)
                try {
                    const alumnosData = await listarAlumnos();
                    const listaAlumnos = Array.isArray(alumnosData)
                        ? alumnosData
                        : alumnosData?.content || null;

                    if (listaAlumnos && listaAlumnos.length > 0) {
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
                    } else {
                        setStudentOptions(defaultStudents);
                    }
                } catch {
                    setStudentOptions(defaultStudents);
                }

                // 2. Cargar Materias desde el MS de Notas
                let materiasList = [];
                try {
                    const dataMaterias = await listarMaterias();
                    materiasList = Array.isArray(dataMaterias)
                        ? dataMaterias
                        : dataMaterias?.content || dataMaterias?.data || [];
                } catch (errMaterias) {
                    console.warn("No se pudieron cargar materias desde el backend:", errMaterias?.message);
                }

                if (materiasList.length > 0) {
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
                } else {
                    // Fallback con opciones representativas para que la UI no quede vacía
                    setSubjectOptions([
                        { label: "Matemática — Lunes y Miércoles 14:00 (Gs. 100.000)", value: 1, nombre: "Matemática", horario: "Lunes y Miércoles 14:00", costo: 100000 },
                        { label: "Física — Martes y Jueves 16:00 (Gs. 100.000)", value: 2, nombre: "Física", horario: "Martes y Jueves 16:00", costo: 100000 },
                        { label: "Química — Miércoles y Viernes 15:00 (Gs. 100.000)", value: 3, nombre: "Química", horario: "Miércoles y Viernes 15:00", costo: 100000 },
                        { label: "Biología — Jueves 17:00 (Gs. 100.000)", value: 4, nombre: "Biología", horario: "Jueves 17:00", costo: 100000 },
                        { label: "Informática — Sábados 09:00 (Gs. 120.000)", value: 5, nombre: "Informática", horario: "Sábados 09:00", costo: 120000 }
                    ]);
                }

                // 3. Cargar Exámenes
                let examenesList = [];
                try {
                    const resp = await api.get("/examenes");
                    examenesList = Array.isArray(resp.data) ? resp.data : resp.data?.content || [];
                } catch {
                    // Si no existe /examenes general, intentar obtener exámenes por cada materia disponible
                    if (materiasList.length > 0) {
                        try {
                            const promesas = materiasList.slice(0, 5).map((m) =>
                                listarExamenesPorMateria(m.id || m.idMateria).catch(() => [])
                            );
                            const resListas = await Promise.all(promesas);
                            examenesList = resListas.flat().filter(Boolean);
                        } catch {
                            examenesList = [];
                        }
                    }
                }

                if (examenesList.length > 0) {
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
                } else {
                    // Fallback con opciones estándar para exámenes
                    setExamOptions([
                        { label: "Parcial Matemática — 15/11/2026 (Gs. 150.000)", value: 1, idMateria: 1, nombre: "Parcial Matemática", horario: "15/11/2026 14:00", costo: 150000 },
                        { label: "Final Programación — 20/11/2026 (Gs. 150.000)", value: 2, idMateria: 5, nombre: "Final Programación", horario: "20/11/2026 16:00", costo: 150000 },
                        { label: "Final Química — 25/11/2026 (Gs. 150.000)", value: 3, idMateria: 3, nombre: "Final Química", horario: "25/11/2026 15:00", costo: 150000 },
                        { label: "Final Física — 30/11/2026 (Gs. 150.000)", value: 4, idMateria: 2, nombre: "Final Física", horario: "30/11/2026 16:00", costo: 150000 }
                    ]);
                }
            } catch (errGeneral) {
                console.error("Error al cargar datos iniciales de inscripción:", errGeneral);
            } finally {
                setLoadingData(false);
            }
        };

        cargarDatosIniciales();
    }, []);

    // Manejar selección de un alumno desde el combobox
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

    // Si el usuario escribe manualmente el ID de Alumno
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
        }
    };

    // Pre-llenar costo al seleccionar materia o examen
    const handleSelectSubject = (id) => {
        setSelectedSubjectId(id);
        const mat = subjectOptions.find((s) => s.value === id);
        if (mat) {
            setItemCosto(String(mat.costo || 100000));
        }
        setFormItemError(null);
    };

    const handleSelectExam = (id) => {
        setSelectedExamId(id);
        const ex = examOptions.find((e) => e.value === id);
        if (ex) {
            setItemCosto(String(ex.costo || 150000));
        }
        setFormItemError(null);
    };

    // Agregar ítem (materia o examen) a la lista local
    const handleAddItem = (e) => {
        e?.preventDefault();
        setFormItemError(null);

        if (seccion === "subject") {
            if (!selectedSubjectId) {
                setFormItemError("Debes seleccionar una materia para agregar.");
                return;
            }
            const mat = subjectOptions.find((s) => s.value === selectedSubjectId);
            const costoNum = Number(itemCosto) || (mat ? mat.costo : 100000);

            const nuevoItem = {
                idLocal: Date.now() + Math.random(),
                tipo: "MATERIA",
                idMateria: mat.value,
                idExamen: null,
                nombre: mat.nombre || mat.label,
                horario: mat.horario || "Horario regular",
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
            const costoNum = Number(itemCosto) || (ex ? ex.costo : 150000);

            const nuevoItem = {
                idLocal: Date.now() + Math.random(),
                tipo: "EXAMEN",
                idMateria: ex.idMateria || null,
                idExamen: ex.value,
                nombre: ex.nombre || ex.label,
                horario: ex.horario || "Fecha fijada",
                costo: costoNum
            };

            setItemsInscripcion((prev) => [...prev, nuevoItem]);
            setSelectedExamId(null);
            setItemCosto("");
        }
    };

    // Eliminar un ítem de la lista local
    const handleRemoveItem = (itemRow) => {
        const idLocal = itemRow._idLocal;
        setItemsInscripcion((prev) => prev.filter((it) => it.idLocal !== idLocal));
    };

    // Calcular costo total acumulado
    const totalCosto = itemsInscripcion.reduce((acc, curr) => acc + (Number(curr.costo) || 0), 0);

    // Enviar la inscripción completa al backend
    const handleSubmitInscripcion = async () => {
        setError(null);

        // Validación 1: ID de Alumno
        const finalIdAlumno = Number(studentIdInput);
        if (!finalIdAlumno || isNaN(finalIdAlumno) || finalIdAlumno <= 0) {
            setError("Debes indicar un ID de Alumno válido (número positivo). Puedes seleccionarlo de la lista o escribirlo.");
            return;
        }

        // Validación 2: Al menos un detalle de inscripción
        if (itemsInscripcion.length === 0) {
            setError("Debes agregar al menos una materia o examen a la inscripción antes de confirmar.");
            return;
        }

        // Construir el InscripcionDTO con la estructura requerida por el backend:
        // {
        //   "idAlumno": 123,
        //   "idSecretaria": 1,
        //   "detallesInscripcion": [
        //     { "idMateria": 5, "tipo": "MATERIA", "costo": 100000 },
        //     { "idExamen": 8, "tipo": "EXAMEN", "costo": 150000 }
        //   ]
        // }
        const dto = {
            idAlumno: finalIdAlumno,
            idSecretaria: 1, // Por defecto secretaría activa
            detallesInscripcion: itemsInscripcion.map((it) => {
                const det = {
                    tipo: it.tipo,
                    costo: Number(it.costo) || 0
                };
                if (it.tipo === "MATERIA" && it.idMateria) {
                    det.idMateria = Number(it.idMateria);
                }
                if (it.tipo === "EXAMEN" && it.idExamen) {
                    det.idExamen = Number(it.idExamen);
                    if (it.idMateria) det.idMateria = Number(it.idMateria);
                }
                return det;
            })
        };

        setSubmitting(true);
        try {
            await crearInscripcion(dto);
            // Redirigir a /inscripciones con mensaje de confirmación
            navigate("/inscripciones", {
                state: {
                    mensajeExito: `¡Inscripción para el alumno #${finalIdAlumno} registrada con éxito!`
                }
            });
        } catch (err) {
            console.error("Error al enviar inscripción:", err);
            const msg = err.response?.data?.message || err.message;
            if (err.message === "Network Error") {
                setError("Error de red: No se pudo contactar con el API Gateway en http://localhost:8084. Verifica que los servicios estén iniciados.");
            } else {
                setError(msg || "Error al procesar la inscripción en el servidor.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Encabezados y datos para la tabla de ítems agregados
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

            {/* Alerta de Error Principal */}
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
                                    className="w-full"
                                    type="number"
                                    min="1"
                                    placeholder="Ej: 1 o 123"
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
                                    className="w-full"
                                    type="text"
                                    placeholder="1234567"
                                    value={studentCedula}
                                    onChange={(e) => setStudentCedula(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Correo Electrónico</label>
                                <input
                                    className="w-full"
                                    type="email"
                                    placeholder="alumno@ejemplo.com"
                                    value={studentEmail}
                                    onChange={(e) => setStudentEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {studentNombre && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                                <i className="icon-[heroicons--user-circle] text-base text-(--btnColor-primary)"></i>
                                <span>Alumno asignado: <strong className="text-slate-800">{studentNombre}</strong> (ID: {studentIdInput})</span>
                            </div>
                        )}
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
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 px-5 shadow-sm hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer text-sm font-semibold"
                        >
                            <i className="icon-[heroicons--plus] text-white mr-1.5 text-base"></i>
                            Agregar a la lista
                        </button>
                    </div>
                </div>
            </div>

            {/* TARJETA 3: LISTA DE ITEMS A INSCRIBIR Y CONFIRMACIÓN */}
            <div className="card flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3>Items de la Inscripción</h3>
                        <p className="text-xs text-gray-500">
                            {itemsInscripcion.length} {itemsInscripcion.length === 1 ? "elemento agregado" : "elementos agregados"}
                        </p>
                    </div>

                    {/* Resumen del Monto Total */}
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold block">Total a Facturar</span>
                        <span className="text-xl font-extrabold text-(--btnColor-primary)">
                            Gs. {totalCosto.toLocaleString("es-PY")}
                        </span>
                    </div>
                </div>

                {/* Tabla de Items */}
                <Table
                    headers={headersTable}
                    data={dataTable}
                    actions={tableActions}
                    showPagination={false}
                />

                {/* Barra de acción final para Confirmar Inscripción */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                        Al confirmar, se registrará la inscripción en el microservicio y estará disponible de inmediato.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => navigate("/inscripciones")}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-sm font-medium"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            disabled={submitting || itemsInscripcion.length === 0}
                            onClick={handleSubmitInscripcion}
                            className={`flex items-center px-6 py-2 rounded-xl text-white font-semibold text-sm shadow-md transition-all ${
                                submitting || itemsInscripcion.length === 0
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                                    : "bg-(--btnColor-primary) hover:bg-(--btnColor-primary-hover) cursor-pointer"
                            }`}
                        >
                            {submitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Guardando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <i className="icon-[heroicons--check] text-lg"></i>
                                    <span>Confirmar Inscripción</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
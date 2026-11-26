import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './Modal'
import { Spinner } from './Spinner'
import { CampoContrasenha } from './CampoContrasenha'
import { errorDeContrasenha, iniciales } from './perfilUtils'
import { obtenerPerfil, actualizarPerfil, cambiarContrasenha } from '../services/usuariosService'
import { mensajeDeError } from '../services/api'

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary) disabled:bg-gray-100 disabled:text-gray-500"
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-1"
const SIN_DATO = '—'

// Mismas reglas que el backend
const TELEFONO_REGEX = /^\+?\d+$/
const LARGO_MAXIMO_NOMBRE = 100
const LARGO_MAXIMO_TELEFONO = 20

const TITULOS = { ver: 'Mi perfil', editar: 'Editar perfil', contrasenha: 'Cambiar contraseña' }
const CONTRASENHAS_VACIAS = { contrasenhaActual: '', contrasenhaNueva: '', confirmarContrasenha: '' }

// "PROFESOR" -> "Profesor"
const nombreDeRol = (rol) => rol.charAt(0) + rol.slice(1).toLowerCase()

/**
 * Perfil del usuario logueado. Se abre en modo "ver"; desde ahí se pasa a editar
 * (nombre y teléfono) o a cambiar la contraseña. El email y el rol no se pueden cambiar.
 *
 * Se monta solo mientras está abierto ({abierto && <PerfilModal />}): así cada vez
 * arranca en "ver", sin contraseñas escritas y con los datos recién pedidos.
 *
 * @param {function} onPerfilActualizado -> recibe el perfil cada vez que se carga o se guarda
 */
export const PerfilModal = ({ onClose, onPerfilActualizado }) => {
    const [modo, setModo] = useState('ver')
    const [perfil, setPerfil] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [errorCarga, setErrorCarga] = useState(null)
    const [guardando, setGuardando] = useState(false)
    const [form, setForm] = useState({ nombre: '', telefono: '' })
    const [contrasenhas, setContrasenhas] = useState(CONTRASENHAS_VACIAS)

    const pedirPerfil = () =>
        obtenerPerfil()
            .then((datos) => {
                setPerfil(datos)
                onPerfilActualizado?.(datos)
            })
            .catch((err) => setErrorCarga(mensajeDeError(err, 'No se pudieron cargar tus datos.')))
            .finally(() => setCargando(false))

    // Al abrir, datos frescos
    useEffect(() => {
        pedirPerfil()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const reintentar = () => {
        setCargando(true)
        setErrorCarga(null)
        pedirPerfil()
    }

    const cerrar = () => {
        if (guardando) return // no se cierra a mitad de un guardado
        onClose()
    }

    const volverAVer = () => {
        if (guardando) return
        setModo('ver')
        setContrasenhas(CONTRASENHAS_VACIAS)
    }

    const abrirEditar = () => {
        setForm({ nombre: perfil.nombre || '', telefono: perfil.telefono || '' })
        setModo('editar')
    }

    const handleFormChange = (e) => {
        const { name } = e.target
        let { value } = e.target
        // En el teléfono solo se aceptan dígitos y un "+" al inicio
        if (name === 'telefono') value = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
        setForm({ ...form, [name]: value })
    }

    const handleContrasenhaChange = (e) =>
        setContrasenhas({ ...contrasenhas, [e.target.name]: e.target.value })

    const guardarDatos = async (e) => {
        e.preventDefault()
        if (guardando) return

        const nombre = form.nombre.trim()
        const telefono = form.telefono.trim()
        if (!nombre) return toast.warning('El nombre es obligatorio.')
        if (nombre.length > LARGO_MAXIMO_NOMBRE)
            return toast.warning(`El nombre no puede tener más de ${LARGO_MAXIMO_NOMBRE} caracteres.`)
        if (!TELEFONO_REGEX.test(telefono))
            return toast.warning('El teléfono solo puede contener números (y un + al inicio).')
        if (telefono.length > LARGO_MAXIMO_TELEFONO)
            return toast.warning(`El teléfono no puede tener más de ${LARGO_MAXIMO_TELEFONO} caracteres.`)

        if (nombre === perfil.nombre && telefono === perfil.telefono) {
            setModo('ver')
            return
        }

        setGuardando(true)
        try {
            const actualizado = await actualizarPerfil({ nombre, telefono })
            setPerfil(actualizado)
            onPerfilActualizado?.(actualizado)
            setModo('ver')
            toast.success('Tus datos se guardaron correctamente.')
        } catch (err) {
            toast.error(mensajeDeError(err, 'No se pudieron guardar tus datos.'))
        } finally {
            setGuardando(false)
        }
    }

    const guardarContrasenha = async (e) => {
        e.preventDefault()
        if (guardando) return

        const { contrasenhaActual, contrasenhaNueva, confirmarContrasenha } = contrasenhas
        if (!contrasenhaActual) return toast.warning('Ingresá tu contraseña actual.')
        const error = errorDeContrasenha(contrasenhaNueva)
        if (error) return toast.warning(error)
        if (contrasenhaNueva !== confirmarContrasenha) return toast.warning('Las contraseñas nuevas no coinciden.')
        if (contrasenhaNueva === contrasenhaActual)
            return toast.warning('La contraseña nueva tiene que ser distinta de la actual.')

        setGuardando(true)
        try {
            await cambiarContrasenha({ contrasenhaActual, contrasenhaNueva })
            setContrasenhas(CONTRASENHAS_VACIAS)
            setModo('ver')
            toast.success('Tu contraseña se cambió correctamente.')
        } catch (err) {
            toast.error(mensajeDeError(err, 'No se pudo cambiar la contraseña.'))
        } finally {
            setGuardando(false)
        }
    }

    const botonesPie = (textoGuardar) => (
        <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
            <button
                type="button"
                onClick={volverAVer}
                disabled={guardando}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50"
            >
                Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-60">
                {guardando && <Spinner className="h-4 w-4 text-white" />}
                {textoGuardar}
            </button>
        </div>
    )

    const renderContenido = () => {
        if (cargando && !perfil) {
            return (
                <div className="p-10 bg-(--bgColor-main) flex justify-center">
                    <Spinner className="h-8 w-8 text-(--btnColor-primary)" />
                </div>
            )
        }

        if (errorCarga && !perfil) {
            return (
                <div className="p-8 bg-(--bgColor-main) flex flex-col items-center gap-4 text-sm text-center">
                    <p className="text-slate-700">{errorCarga}</p>
                    <button type="button" className="btn-primary cursor-pointer" onClick={reintentar}>Reintentar</button>
                </div>
            )
        }

        if (!perfil) return null

        if (modo === 'editar') {
            return (
                <form onSubmit={guardarDatos} className="flex flex-col">
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">
                        <div>
                            <label htmlFor="perfil-nombre" className={LABEL_CLASS}>Nombre y apellido</label>
                            <input id="perfil-nombre" name="nombre" type="text" value={form.nombre} autoFocus
                                maxLength={LARGO_MAXIMO_NOMBRE} autoComplete="name"
                                onChange={handleFormChange} className={INPUT_CLASS} disabled={guardando} />
                        </div>
                        <div>
                            <label htmlFor="perfil-telefono" className={LABEL_CLASS}>Teléfono</label>
                            <input id="perfil-telefono" name="telefono" type="tel" inputMode="numeric" value={form.telefono}
                                maxLength={LARGO_MAXIMO_TELEFONO} autoComplete="tel" placeholder="Ej. 0983123456"
                                onChange={handleFormChange} className={INPUT_CLASS} disabled={guardando} />
                        </div>
                        <div>
                            <label htmlFor="perfil-email" className={LABEL_CLASS}>Email</label>
                            <input id="perfil-email" type="email" value={perfil.email} className={INPUT_CLASS} disabled />
                            <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar.</p>
                        </div>
                    </div>
                    {botonesPie('Guardar cambios')}
                </form>
            )
        }

        if (modo === 'contrasenha') {
            return (
                <form onSubmit={guardarContrasenha} className="flex flex-col">
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">
                        <CampoContrasenha id="contrasenhaActual" label="Contraseña actual" autoComplete="current-password"
                            value={contrasenhas.contrasenhaActual} onChange={handleContrasenhaChange} disabled={guardando} autoFocus />
                        <CampoContrasenha id="contrasenhaNueva" label="Contraseña nueva" autoComplete="new-password"
                            value={contrasenhas.contrasenhaNueva} onChange={handleContrasenhaChange} disabled={guardando} />
                        <CampoContrasenha id="confirmarContrasenha" label="Repetir contraseña nueva" autoComplete="new-password"
                            value={contrasenhas.confirmarContrasenha} onChange={handleContrasenhaChange} disabled={guardando} />
                        <p className="text-xs text-gray-500 -mt-2">Mínimo 8 caracteres.</p>
                    </div>
                    {botonesPie('Cambiar contraseña')}
                </form>
            )
        }

        // modo "ver"
        const roles = perfil.roles?.length ? perfil.roles : [perfil.rol]
        return (
            <>
                <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5 text-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 rounded-full bg-(--btnColor-primary) text-white flex items-center justify-center text-lg font-bold">
                            {iniciales(perfil.nombre)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-semibold text-slate-800 break-words">{perfil.nombre}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {roles.map((rol) => (
                                    <span key={rol} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-(--btnColor-sidebar-hover) text-(--btnColor-primary)">
                                        {nombreDeRol(rol)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <dl className="flex flex-col gap-4">
                        {[['Email', perfil.email], ['Teléfono', perfil.telefono]].map(([label, valor]) => (
                            <div key={label}>
                                <dt className={LABEL_CLASS}>{label}</dt>
                                <dd className="text-slate-800 break-all">{valor || SIN_DATO}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex flex-wrap justify-end items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setModo('contrasenha')}
                        className="text-sm font-medium text-gray-600 hover:text-(--btnColor-primary) transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <i className="icon-[heroicons--key] text-base"></i>
                        Cambiar contraseña
                    </button>
                    <button type="button" className="btn-primary cursor-pointer flex items-center gap-1.5" onClick={abrirEditar}>
                        <i className="icon-[heroicons--pencil-square] text-base"></i>
                        Editar
                    </button>
                </div>
            </>
        )
    }

    return (
        <Modal isOpen onClose={cerrar} title={TITULOS[modo]} size="md">
            {renderContenido()}
        </Modal>
    )
}

import imgLogo from '../assets/CursilloPy-LOGO.png'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CampoContrasenha } from '../components/CampoContrasenha'
import { errorDeContrasenha } from '../components/perfilUtils'
import { SegmentedControl } from '../components/SegmentedControl'
import { Spinner } from '../components/Spinner'
import { authService } from '../services/authService'
import { getStoredToken, mensajeDeError } from '../services/api'

const SECCIONES = [
    { label: 'Iniciar Sesión', value: 'iniciarSesion' },
    { label: 'Registrarse', value: 'registrarse' }
]

const FORM_VACIO = { nombre: '', email: '', telefono: '', contrasenha: '', confirmarContrasenha: '' }

// Mismas reglas que en Alumnos y en el backend
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+$/
const TELEFONO_REGEX = /^\+?\d+$/

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)"
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-1"

const SIN_CONEXION = 'No se pudo conectar con el servidor. Intentá de nuevo en unos minutos.'

// Sin respuesta o con un 5xx, el problema es del servidor y no de los datos ingresados
const esErrorDelServidor = (err) => !err.response || err.response.status >= 500

export const LoginPage = () => {
    const navigate = useNavigate()

    const [seccion, setSeccion] = useState('iniciarSesion')
    const [form, setForm] = useState(FORM_VACIO)
    const [cargando, setCargando] = useState(false)

    const registrando = seccion === 'registrarse'

    // Si quedó guardado un token que ya no sirve, se borra y se explica por qué hay que volver a ingresar
    useEffect(() => {
        if (!getStoredToken() || authService.getRutaInicio() !== '/login') return
        const mensaje = authService.isAuthenticated()
            ? 'Tu usuario no tiene un rol válido. Consultá con la secretaría.'
            : 'Tu sesión expiró. Volvé a ingresar.'
        authService.logout()
        toast.warning(mensaje)
    }, [])

    const cambiarSeccion = (nueva) => {
        if (cargando || nueva === seccion) return
        setSeccion(nueva)
        // El email sirve en las dos secciones; las contraseñas y el resto no se arrastran
        setForm({ ...FORM_VACIO, email: form.email })
    }

    const handleInputChange = (e) => {
        const { name } = e.target
        let { value } = e.target
        // En el teléfono solo se aceptan dígitos y un "+" al inicio
        if (name === 'telefono') {
            value = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
        }
        setForm({ ...form, [name]: value })
    }

    // Devuelve el primer problema del formulario, o null si está todo bien
    const validar = () => {
        if (registrando && !form.nombre.trim()) return 'El nombre es obligatorio.'
        if (!EMAIL_REGEX.test(form.email.trim())) return 'Ingresá un email válido.'
        if (!registrando) return form.contrasenha ? null : 'Ingresá tu contraseña.'

        if (!TELEFONO_REGEX.test(form.telefono)) return 'El teléfono solo puede contener números (y un + al inicio).'
        const errorContrasenha = errorDeContrasenha(form.contrasenha)
        if (errorContrasenha) return errorContrasenha
        if (form.contrasenha !== form.confirmarContrasenha) return 'Las contraseñas no coinciden.'
        return null
    }

    const iniciarSesion = async () => {
        try {
            await authService.login(form.email.trim(), form.contrasenha)
            const ruta = authService.getRutaInicio()
            if (ruta === '/login') {
                // El token no trae un rol que el sistema conozca
                authService.logout()
                toast.error('Tu usuario no tiene un rol válido. Consultá con la secretaría.')
                return
            }
            navigate(ruta, { replace: true })
        } catch (err) {
            console.error('Error al iniciar sesión:', err)
            if (esErrorDelServidor(err)) toast.error(SIN_CONEXION)
            else if (err.response.status === 401) toast.error('Email o contraseña incorrectos.')
            else toast.error(mensajeDeError(err, 'No se pudo iniciar sesión.'))
        }
    }

    const registrar = async () => {
        try {
            const email = form.email.trim()
            await authService.register(form.nombre.trim(), email, form.contrasenha, form.telefono)
            toast.success('Cuenta creada correctamente. Ya podés iniciar sesión.')
            setSeccion('iniciarSesion')
            setForm({ ...FORM_VACIO, email })
        } catch (err) {
            console.error('Error al registrar usuario:', err)
            toast.error(esErrorDelServidor(err) ? SIN_CONEXION : mensajeDeError(err, 'No se pudo crear la cuenta.'))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (cargando) return

        const problema = validar()
        if (problema) {
            toast.warning(problema)
            return
        }

        setCargando(true)
        await (registrando ? registrar() : iniciarSesion())
        setCargando(false)
    }

    // Con la sesión abierta no hace falta volver a ingresar
    const rutaInicio = authService.getRutaInicio()
    if (rutaInicio !== '/login') return <Navigate to={rutaInicio} replace />

    const campoEmail = (
        <div>
            <label htmlFor="email" className={LABEL_CLASS}>Email</label>
            <input id="email" name="email" type="email" maxLength={255} autoComplete="username"
                value={form.email} onChange={handleInputChange} disabled={cargando}
                placeholder="correo@gmail.com" className={INPUT_CLASS} />
        </div>
    )

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-(--bgColor-main) p-4">
            <div className={`card items-center p-6 sm:p-8 ${registrando ? 'max-w-xl' : 'max-w-sm'}`}>
                <img className="max-h-24 w-auto object-contain" src={imgLogo} alt="CursilloPy Logo" />
                <SegmentedControl value={seccion} onChange={cambiarSeccion} options={SECCIONES} />

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4" noValidate>
                    {registrando ? (
                        <>
                            <div>
                                <label htmlFor="nombre" className={LABEL_CLASS}>Nombre y apellido</label>
                                <input id="nombre" name="nombre" type="text" maxLength={100} autoComplete="name"
                                    value={form.nombre} onChange={handleInputChange} disabled={cargando}
                                    placeholder="Fulano De Tal" className={INPUT_CLASS} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {campoEmail}
                                <div>
                                    <label htmlFor="telefono" className={LABEL_CLASS}>Teléfono</label>
                                    <input id="telefono" name="telefono" type="tel" inputMode="tel" maxLength={20} autoComplete="tel"
                                        value={form.telefono} onChange={handleInputChange} disabled={cargando}
                                        placeholder="Ej. 0983123456" className={INPUT_CLASS} />
                                </div>
                                <CampoContrasenha key="nueva" id="contrasenha" label="Contraseña" autoComplete="new-password"
                                    value={form.contrasenha} onChange={handleInputChange} disabled={cargando} />
                                <CampoContrasenha id="confirmarContrasenha" label="Confirmar contraseña" autoComplete="new-password"
                                    value={form.confirmarContrasenha} onChange={handleInputChange} disabled={cargando} />
                            </div>
                        </>
                    ) : (
                        <>
                            {campoEmail}
                            <CampoContrasenha key="actual" id="contrasenha" label="Contraseña" autoComplete="current-password"
                                value={form.contrasenha} onChange={handleInputChange} disabled={cargando} />
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={cargando}
                        className="btn-primary w-full mt-2 gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {cargando && <Spinner />}
                        {registrando
                            ? (cargando ? 'Registrando...' : 'Registrarse')
                            : (cargando ? 'Ingresando...' : 'Ingresar')}
                    </button>
                </form>
            </div>
        </div>
    )
}

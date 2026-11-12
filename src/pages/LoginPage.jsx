import imgLogo from '../assets/CursilloPy-LOGO.png'
import { useState } from 'react'
import { SegmentedControl } from '../components/SegmentedControl'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { Spinner } from "../components/Spinner"

export const LoginPage = () => {

    const [email, setEmail] = useState('');
    const [contrasenha, setContrasenha] = useState('');
    const [error, setError] = useState('');
    const [seccion, setSeccion] = useState('iniciarSesion')
    const navigate = useNavigate()
    const [cargando, setCargando] = useState(false);

    //para registro
    const [nombre, setNombre] = useState('');
    const [confirmarContra, setConfirmarContra] = useState('');

    const options = [
        { label: 'Iniciar Sesión', value: 'iniciarSesion' },
        { label: 'Registrarse', value: 'registrarse' }
    ]

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setCargando(true);

        if (seccion === 'iniciarSesion') {
            try {
                const usuario = await authService.login(email, contrasenha);
                console.log('Sesion iniciada: ', usuario);
                if (usuario.rol === 'SECRETARIA') navigate('/');
                else if (usuario.rol === 'PROFESOR') navigate('/profesor/dashboard');
            } catch (err) {
                setError('Credenciales incorrectas.')
                setCargando(false);
            }
        } else {
            if (contrasenha.length < 8) {
                setError('La contraseña debe tener al menos 8 caracteres.');
                setCargando(false);
                return;
            }
            if (contrasenha !== confirmarContra) {
                setError('Las contraseñas no coinciden');
                setCargando(false);
                return;
            }

            try {
                await authService.register(nombre, email, contrasenha);
                setSeccion('iniciarSesion');
                setError(null);
                setCargando(false);
            } catch (err) {
                const mensaje = err.response?.data?.message || 'Error al registrar usuario.'
                setError(mensaje);
                setCargando(false);
            }
        }
    }


    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-(--bgColor-main) p-4 py-8">
            <div className="card items-center h-auto p-8 max-w-md">
                <div className='flex flex-col items-center gap-5'>
                    <img className="max-h-24 w-auto object-contain mx-auto" src={imgLogo} alt="CursilloPy Logo"></img>
                    <SegmentedControl
                        value={seccion}
                        onChange={setSeccion}
                        options={options}
                    />
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3" autoComplete="off">
                    {seccion == 'registrarse' ? (
                        <>
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Fulano De Tal"
                                autoComplete="off"
                                required
                            />
                            <label>Correo</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="correo@gmail.com"
                                autoComplete="off"
                                required
                            />
                            <label>Contraseña</label>
                            <input
                                type="password"
                                value={contrasenha}
                                onChange={(e) => setContrasenha(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                            <label>Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmarContra}
                                onChange={(e) => setConfirmarContra(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                        </>
                    ) : (
                        <>
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="correo@gmail.com"
                                autoComplete="off"
                                required
                            />
                            <label>Contraseña</label>
                            <input
                                type="password"
                                value={contrasenha}
                                onChange={(e) => setContrasenha(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="off"
                                required
                            />
                        </>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm text-center mt-2 font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type='submit'
                        disabled={cargando}
                        className={`btn-primary w-64 mt-4 mx-auto flex items-center justify-center gap-2 ${cargando ? 'opacity-70 cursor-not-allowed' : ''}`}>

                        {cargando && <Spinner />}

                        {cargando
                            ? (seccion === 'registrarse' ? 'Registrando...' : 'Ingresando...')
                            : (seccion === 'registrarse' ? 'Registrarse' : 'Ingresar')
                        }
                    </button>
                </form>

            </div>
        </div>
    )
}
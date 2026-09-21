import imgLogo from '../assets/CursilloPy-LOGO.png'
import { useState } from 'react'
import { SegmentedControl } from '../components/SegmentedControl'
import { useNavigate } from 'react-router-dom'

export const LoginPage = () => {

    const [seccion, setSeccion] = useState('iniciarSesion')
    const navigate = useNavigate()

    const options = [
        { label: 'Iniciar Sesión', value: 'iniciarSesion' },
        { label: 'Registrarse', value: 'registrarse' }
    ]


    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-(--bgColor-main) p-4 py-8">
            <div className="flex flex-col h-auto bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <div className='flex flex-col items-center gap-5'>
                    <img className="max-h-24 w-auto object-contain mx-auto" src={imgLogo} alt="CursilloPy Logo"></img>
                    <SegmentedControl
                        value={seccion}
                        onChange={setSeccion}
                        options={options}
                    />
                </div>
                <form className="flex flex-col gap-3" autoComplete="off">
                    {seccion == 'registrarse' ? (
                        <>
                            <label>Nombre</label>
                            <input type="text" placeholder="Fulano De Tal" autoComplete="off"></input>
                            <label>Correo</label>
                            <input type="email" placeholder="correo@gmail.com" autoComplete="off"></input>
                            <label>Contraseña</label>
                            <input type="password" placeholder="••••••••" autoComplete="new-password"></input>
                            <label>Confirmar Contraseña</label>
                            <input type="password" placeholder="••••••••" autoComplete="new-password"></input>
                        </>
                    ) : (
                        <>
                            <label>Email</label>
                            <input type="email" placeholder="correo@gmail.com" autoComplete="off"></input>
                            <label>Contraseña</label>
                            <input type="password" placeholder="••••••••" autoComplete="off"></input>
                        </>
                    )}
                </form>
                <button
                    type='submit'
                    className="p-2 mt-5 bg-(--btnColor-primary) text-(--textColor-secondary) rounded-md shadow-lg hover:bg-(--btnColor-primary-hover) cursor-pointer"
                    onClick={() => navigate("/")}>
                    Ingresar</button>
            </div>
        </div>
    )
}
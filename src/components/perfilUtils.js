// Los mismos límites que valida ms-auth
export const LARGO_MINIMO_CONTRASENHA = 8
export const BYTES_MAXIMOS_CONTRASENHA = 72 // límite de BCrypt

/**
 * Devuelve el error de una contraseña nueva, o null si es válida.
 */
export const errorDeContrasenha = (contrasenha) => {
    if (!contrasenha.trim() || contrasenha.length < LARGO_MINIMO_CONTRASENHA)
        return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENHA} caracteres.`
    if (new TextEncoder().encode(contrasenha).length > BYTES_MAXIMOS_CONTRASENHA)
        return 'La contraseña es demasiado larga.'
    return null
}

// Iniciales para el avatar: "Ana Gómez" -> "AG"; un email usa su primera letra
export const iniciales = (nombre) =>
    (nombre || '').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?'

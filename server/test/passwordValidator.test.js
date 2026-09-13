const { validateAdminPassword } = require('../utils/passwordValidator');

describe('validateAdminPassword', () => {
    it('acepta una contraseña que cumple todos los requisitos', () => {
        expect(validateAdminPassword('ClaveNueva2026')).toEqual({ valid: true });
    });

    it.each([
        [undefined, 'La contraseña es obligatoria'],
        ['', 'La contraseña es obligatoria'],
    ])('rechaza una contraseña ausente (%j)', (password, error) => {
        expect(validateAdminPassword(password)).toEqual({ valid: false, error });
    });

    it.each([
        ['Corta1', 'al menos 8 caracteres'],
        ['sinmayuscula123', 'al menos una mayúscula'],
        ['SINMINUSCULA123', 'al menos una minúscula'],
        ['SinNumerosAca', 'al menos un número'],
    ])('rechaza "%s" porque le falta: %s', (password, missing) => {
        const result = validateAdminPassword(password);

        expect(result.valid).toBe(false);
        expect(result.error).toContain(missing);
    });

    it('informa todos los requisitos incumplidos juntos', () => {
        const { error } = validateAdminPassword('abc');

        expect(error).toContain('al menos 8 caracteres');
        expect(error).toContain('al menos una mayúscula');
        expect(error).toContain('al menos un número');
        expect(error).not.toContain('minúscula');
    });

    it.each(['Password1', 'Password123', 'Qwerty123'])(
        'rechaza "%s" por ser una contraseña común, aunque cumpla el formato',
        (password) => {
            const result = validateAdminPassword(password);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('demasiado común');
        }
    );
});

const bcrypt = require('bcrypt');
const Password = require('../models/Password');
const {
    initializePassword,
    validatePassword,
    isUsingDefaultPassword,
    changePassword,
    generateUniqueRecoveryCode,
} = require('../utils/passwordManager');

const DEFAULT_PASSWORD = 'Admin2024!';
const CURRENT_PASSWORD = 'ClaveActual2026';
const NEW_PASSWORD = 'ClaveNueva2026';

// Formato RECOV-XXXX-XXXX, sin caracteres ambiguos (I, O, 0, 1)
const RECOVERY_CODE = /^RECOV-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

// Hash real calculado una vez: bcrypt es lento a propósito
let currentHash;
beforeAll(async () => {
    currentHash = await bcrypt.hash(CURRENT_PASSWORD, 10);
});

// Registro de contraseña simulado, como lo devolvería Sequelize
const fakeRecord = (overrides = {}) => ({
    passwordHash: currentHash,
    isDefault: false,
    recoveryCode: null,
    save: vi.fn().mockResolvedValue(),
    ...overrides,
});

// Password.findOne se usa para dos cosas: traer el registro (sin filtro) y
// verificar si un código de recuperación ya existe (con filtro)
const stubFindOne = (record, { existingCodes = [] } = {}) =>
    vi.spyOn(Password, 'findOne').mockImplementation(async (query) => {
        const code = query?.where?.recoveryCode;
        if (code !== undefined) return existingCodes.includes(code) ? { recoveryCode: code } : null;
        return record;
    });

describe('initializePassword', () => {
    it('la primera vez crea la contraseña por defecto, hasheada y marcada como tal', async () => {
        vi.spyOn(Password, 'count').mockResolvedValue(0);
        const create = vi.spyOn(Password, 'create').mockResolvedValue({});

        await initializePassword();

        expect(create).toHaveBeenCalledOnce();
        const [{ passwordHash, isDefault }] = create.mock.calls[0];
        expect(isDefault).toBe(true);
        expect(passwordHash).not.toBe(DEFAULT_PASSWORD);
        expect(await bcrypt.compare(DEFAULT_PASSWORD, passwordHash)).toBe(true);
    });

    it('si ya hay una contraseña configurada no la toca', async () => {
        vi.spyOn(Password, 'count').mockResolvedValue(1);
        const create = vi.spyOn(Password, 'create');

        await initializePassword();

        expect(create).not.toHaveBeenCalled();
    });

    it('propaga el error si la base falla, para que el arranque se detenga', async () => {
        vi.spyOn(Password, 'count').mockRejectedValue(new Error('sin conexión'));

        await expect(initializePassword()).rejects.toThrow('sin conexión');
    });
});

describe('validatePassword', () => {
    it('acepta la contraseña correcta', async () => {
        stubFindOne(fakeRecord());
        expect(await validatePassword(CURRENT_PASSWORD)).toBe(true);
    });

    it('rechaza una contraseña incorrecta', async () => {
        stubFindOne(fakeRecord());
        expect(await validatePassword('OtraClave2026')).toBe(false);
    });

    it('rechaza cualquier contraseña si no hay ninguna configurada', async () => {
        stubFindOne(null);
        expect(await validatePassword(CURRENT_PASSWORD)).toBe(false);
    });
});

describe('isUsingDefaultPassword', () => {
    it.each([
        [true, true],
        [false, false],
    ])('con isDefault=%s devuelve %s', async (isDefault, expected) => {
        stubFindOne(fakeRecord({ isDefault }));
        expect(await isUsingDefaultPassword()).toBe(expected);
    });

    it('devuelve false si no hay contraseña configurada', async () => {
        stubFindOne(null);
        expect(await isUsingDefaultPassword()).toBe(false);
    });
});

describe('changePassword', () => {
    it('rechaza el cambio si la contraseña actual es incorrecta', async () => {
        const record = fakeRecord();
        stubFindOne(record);

        const result = await changePassword('Equivocada2026', NEW_PASSWORD);

        expect(result).toEqual({ success: false, message: 'Contraseña actual incorrecta' });
        expect(record.save).not.toHaveBeenCalled();
    });

    it('rechaza una contraseña nueva débil con el motivo', async () => {
        const record = fakeRecord();
        stubFindOne(record);

        const result = await changePassword(CURRENT_PASSWORD, 'debil');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Contraseña débil');
        expect(record.save).not.toHaveBeenCalled();
    });

    it('no permite volver a la contraseña por defecto', async () => {
        const record = fakeRecord();
        stubFindOne(record);

        const result = await changePassword(CURRENT_PASSWORD, DEFAULT_PASSWORD);

        expect(result).toEqual({ success: false, message: 'No puedes usar la contraseña por defecto' });
        expect(record.save).not.toHaveBeenCalled();
    });

    it('guarda el nuevo hash, quita la marca de por defecto y emite un código de recuperación', async () => {
        const record = fakeRecord({ isDefault: true });
        stubFindOne(record);

        const result = await changePassword(CURRENT_PASSWORD, NEW_PASSWORD);

        expect(result.success).toBe(true);
        expect(result.recoveryCode).toMatch(RECOVERY_CODE);
        expect(record.save).toHaveBeenCalledOnce();
        expect(record.isDefault).toBe(false);
        expect(record.recoveryCode).toBe(result.recoveryCode);
        expect(await bcrypt.compare(NEW_PASSWORD, record.passwordHash)).toBe(true);
        expect(await bcrypt.compare(CURRENT_PASSWORD, record.passwordHash)).toBe(false);
    });

    it('nunca escribe el código de recuperación en los logs', async () => {
        stubFindOne(fakeRecord());
        const log = vi.spyOn(console, 'log');
        const error = vi.spyOn(console, 'error');

        const { recoveryCode } = await changePassword(CURRENT_PASSWORD, NEW_PASSWORD);

        const everythingLogged = [...log.mock.calls, ...error.mock.calls].flat().map(String).join('\n');
        expect(recoveryCode).toMatch(RECOVERY_CODE);
        expect(everythingLogged).not.toContain(recoveryCode);
    });

    it('si falla el guardado responde con un error genérico', async () => {
        stubFindOne(fakeRecord({ save: vi.fn().mockRejectedValue(new Error('sin conexión')) }));

        const result = await changePassword(CURRENT_PASSWORD, NEW_PASSWORD);

        expect(result).toEqual({ success: false, message: 'Error al cambiar contraseña' });
    });
});

describe('generateUniqueRecoveryCode', () => {
    it('genera códigos con el formato esperado', async () => {
        stubFindOne(null);

        for (let i = 0; i < 20; i++) {
            expect(await generateUniqueRecoveryCode()).toMatch(RECOVERY_CODE);
        }
    });

    it('si el código generado ya existe, genera otro', async () => {
        // El primer código "ya existe"; el segundo no
        const findOne = vi.spyOn(Password, 'findOne')
            .mockResolvedValueOnce({ recoveryCode: 'ocupado' })
            .mockResolvedValueOnce(null);

        const code = await generateUniqueRecoveryCode();

        expect(findOne).toHaveBeenCalledTimes(2);
        expect(code).toMatch(RECOVERY_CODE);
    });
});

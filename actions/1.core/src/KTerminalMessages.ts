import { KTerminal } from "./KTerminal.js";

export class KTerminalMessages {
    private terminal: KTerminal;

    constructor() {
        this.terminal = new KTerminal();
    }

    /**
     * # information
     * Formata uma mensagem de informação.
     * @param message A mensagem a ser formatada.
     * @returns A mensagem formatada.
     */
    public information(message: string): string {
        return this.terminal.texto_coloracao(`[INFO] ${message}`, 34); // Azul
    }

    /**
     * # success
     * Formata uma mensagem de sucesso.
     * @param message A mensagem a ser formatada.
     * @returns A mensagem formatada.
     */
    public success(message: string): string {
        return this.terminal.texto_coloracao(`[SUCCESS] ${message}`, 32); // Verde
    }

    /**
     * # warning
     * Formata uma mensagem de aviso.
     * @param message A mensagem a ser formatada.
     * @returns A mensagem formatada.
     */
    public warning(message: string): string {
        return this.terminal.texto_coloracao(`[WARNING] ${message}`, 33); // Amarelo
    }

    /**
     * # error
     * Formata uma mensagem de erro.
     * @param message A mensagem a ser formatada.
     * @returns A mensagem formatada.
     */
    public error(message: string): string {
        return this.terminal.texto_coloracao(`[ERROR] ${message}`, 31); // Vermelho
    }
}

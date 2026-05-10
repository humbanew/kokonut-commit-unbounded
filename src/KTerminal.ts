// 38 	Set foreground color Next arguments are 5;n or 2;r;g;b
// 48 	Set background color 	Next arguments are 5;n or 2;r;g;b

import { T3B4BitsFundo, T3B4BitsTexto, TColorCode, TEstilo, TRGB } from "./defines.js";

export class KTerminal {
    /**
     * # texto_estilo
     * Aplica um estilo ao texto usando códigos ANSI.
     * 
     * 0 - Reset ou normal,
     * 
     * 1 - Negrito ou intensidade aumentada,
     * 
     * 2 - Fraco, intensidade diminuída ou escurecido,
     * 
     * 3 - Itálico,
     * 
     * 4 - Sublinhado;
     * @param texto O texto a ser formatado.
     * @param estilo O estilo a ser aplicado.
     * @returns O texto formatado.
     */
    public texto_estilo(texto: string, estilo: TEstilo): string {
        return `\x1b[${estilo}m${texto}\x1b[0m`;
    }

    /**
     * # texto_coloracao
     * Aplica uma cor ao texto usando códigos ANSI.
     * 
     * 30-37 - Cores padrão (preto, vermelho, verde, amarelo, azul, magenta, ciano, branco)
     * 
     * 90-97 - Cores brilhantes (cinza escuro, vermelho claro, verde claro, amarelo claro, azul claro, magenta claro, ciano claro, branco brilhante)
     * @param texto O texto a ser colorido.
     * @param cor O código da cor a ser aplicada.
     * @returns O texto colorido.
     */
    public texto_coloracao(texto: string, cor: T3B4BitsTexto): string {
        return `\x1b[${cor}m${texto}\x1b[0m`;
    }

    /**
     * # fundo_coloracao
     * Aplica uma cor ao fundo do texto usando códigos ANSI.
     * 
     * 40-47 - Cores padrão (preto, vermelho, verde, amarelo, azul, magenta, ciano, branco)
     * 
     * 100-107 - Cores brilhantes (cinza escuro, vermelho claro, verde claro, amarelo claro, azul claro, magenta claro, ciano claro, branco brilhante)
     * @param texto O texto a ser colorido.
     * @param cor O código da cor a ser aplicada.
     * @returns O texto colorido.
     */
    public fundo_coloracao(texto: string, cor: T3B4BitsFundo): string {
        return `\x1b[${cor}m${texto}\x1b[0m`;
    }

    /**
     * # texto_coloracao_8bits
     * Aplica uma cor ao texto usando códigos ANSI.
     * 
     * 8 bits (256 cores): Use o código 38;5;n para definir a cor do texto, onde n é um valor de 0 a 255.
     * @param texto O texto a ser colorido.
     * @param cor O código da cor a ser aplicada.
     * @returns O texto colorido.
     */
    public texto_coloracao_8bits(texto: string, cor: TColorCode): string {
        return `\x1b[38;5;${cor}m${texto}\x1b[0m`;
    }

    /**
     * # fundo_coloracao_8bits
     * Aplica uma cor ao fundo do texto usando códigos ANSI.
     * 
     * 8 bits (256 cores): Use o código 48;5;n para definir a cor do fundo, onde n é um valor de 0 a 255.
     * @param texto O texto a ser colorido.
     * @param cor O código da cor a ser aplicada.
     * @returns O texto colorido.
     */
    public fundo_coloracao_8bits(texto: string, cor: TColorCode): string {
        return `\x1b[48;5;${cor}m${texto}\x1b[0m`;
    }

    /**
     * # texto_coloracao_24bits
     * Aplica uma cor ao texto usando códigos ANSI.
     * 
     * 24 bits (16 milhões de cores): Use o código 38;2;r;g;b para definir a cor do texto, onde r, g e b são valores de 0 a 255.
     * @param texto O texto a ser colorido.
     * @param rgb O objeto RGB contendo os valores de cor.
     * @returns O texto colorido.
     */
    public texto_coloracao_24bits(texto: string, rgb: TRGB): string {
        return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${texto}\x1b[0m`;
    }

    /**
     * # fundo_coloracao_24bits
     * Aplica uma cor ao fundo do texto usando códigos ANSI.
     * 
     * 24 bits (16 milhões de cores): Use o código 48;2;r;g;b para definir a cor do fundo, onde r, g e b são valores de 0 a 255.
     * @param texto O texto a ser colorido.
     * @param rgb O objeto RGB contendo os valores de cor.
     * @returns O texto colorido.
     */
    public fundo_coloracao_24bits(texto: string, rgb: TRGB): string {
        return `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m${texto}\x1b[0m`;
    }
}

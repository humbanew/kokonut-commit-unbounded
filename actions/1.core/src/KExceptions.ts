import * as core from "@actions/core";
import { KTerminalMessages } from "./KTerminalMessages.js";

export class KExceptions {
    private terminalMessages: KTerminalMessages;

    constructor() {
        this.terminalMessages = new KTerminalMessages();
    }

    public validation(input: string, message: string): void {
        const Input = core.getInput(input);
        if (!Input) {
            core.setFailed(
                this.terminalMessages.error(message)
            );
            return;
        }
    }
}

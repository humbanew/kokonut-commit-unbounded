interface Dictionary {
    [key: string]: Array<string>;
}

export class KAgents {
    protected artificialIntelligenceServiceAPIKey: string = '';
    protected artificialIntelligenceServiceManufacturer: string = '';
    protected artificialIntelligenceServiceModel: string = '';
    protected availableAndAcceptedModels: Dictionary = {
        "google": [
            "gemini-2.5-pro",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemma-3n",
            "gemma-3",
            "gemma-2",
            "gemma"
        ]
    };

    constructor(aisAPIKey: string, aisManufacturer: string, aisModel: string) {
        this.artificialIntelligenceServiceAPIKey = aisAPIKey;
        this.artificialIntelligenceServiceManufacturer = aisManufacturer;
        this.artificialIntelligenceServiceModel = aisModel;
    }
}

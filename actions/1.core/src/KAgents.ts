interface Dictionary {
    [key: string]: [string];
}

export class KAgents {
    protected artificialIntelligenceServiceAPIKey: string = '';
    protected artificialIntelligenceServiceManufacturer: string = 'openai';
    protected artificialIntelligenceServiceModel: string = 'gpt-3.5-turbo';
    protected availableAndAcceptedModels: Dictionary = {};

    constructor(aisAPIKey: string, aisManufacturer: string, aisModel: string) {
        this.artificialIntelligenceServiceAPIKey = aisAPIKey;
        this.artificialIntelligenceServiceManufacturer = aisManufacturer;
        this.artificialIntelligenceServiceModel = aisModel;
    }
}

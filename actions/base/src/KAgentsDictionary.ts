export class KAgentsDictionary {
    
    constructor() {
        console.log('KAgentsDictionary initialized.');
    }

    public dictionary = Object.freeze({
        anthropic: null,
        azure: null,
        deepseek: null,
        google: null,
        huggingface: null,
        langchain: null,
        kimi: null,
        ollama: null,
        perplexity: null,
        mistral: null,
        openai: null,
        xai: null
    });
}

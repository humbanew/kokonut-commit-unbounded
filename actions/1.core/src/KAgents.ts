import { InferenceClient } from "@huggingface/inference";

export class KAgents {

    private hfToken: string;

    public constructor(token: string) {
        if (!token) {
            throw new Error('Hugging Face token is required.');
        }
        this.hfToken = token;
    }

    public async agent(commitMsg: string): Promise<void> {
        const client = new InferenceClient(this.hfToken);
        const response = await client.chatCompletion({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that enchance a commit messages." },
                { role: "user", content: commitMsg }
            ],
            max_tokens: 628
        });
        console.log(response.choices[0].message);
    }

}

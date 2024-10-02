export interface Result {
    text: string;
    choices: { choice: string; isCorrect: boolean; numberOfAnswers: number }[];
}

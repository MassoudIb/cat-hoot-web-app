import { Question } from './question';

export interface Quiz {
    isVisible?: boolean;
    id: string;
    title: string;
    description: string;
    duration: number;
    lastModification: string;
    questions: Question[];
}

export interface Answer {
    isValid: boolean;
}

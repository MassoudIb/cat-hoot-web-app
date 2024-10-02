export interface ListOfQrlAnswer {
    playerId: string;
    username: string;
    answer: string;
    point: number;
    score: number;
}

export interface DataQrlCorrection {
    questionIndex: number;
    questionTitle: string;
    amount0: number;
    amount50: number;
    amount100: number;
}

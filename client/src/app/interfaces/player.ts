export interface Player {
    name: string;
    score: number;
    isPlaying: boolean;
    colorState: string;
    isAllowedToChat?: boolean;
}

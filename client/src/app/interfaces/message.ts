export interface Message {
    username: string;
    message: string;
    timeStamp: Date;
    isSent: boolean;
    isNotification: boolean;
    isAllowedToChat?: boolean;
}

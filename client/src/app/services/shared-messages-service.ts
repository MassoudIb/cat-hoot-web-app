import { Injectable } from '@angular/core';
import { Message } from '@app/interfaces/message';

@Injectable({
    providedIn: 'root',
})
export class SharedMessagesService {
    private roomMessages: Message[] = [];

    addMessage(message: Message) {
        this.roomMessages.push(message);
    }

    getMessages(): Message[] {
        return this.roomMessages;
    }

    clearMessages() {
        this.roomMessages = [];
    }
}

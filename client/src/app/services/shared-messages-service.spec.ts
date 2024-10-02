import { TestBed } from '@angular/core/testing';
import { Message } from '@app/interfaces/message';
import { SharedMessagesService } from './shared-messages-service';

describe('SharedMessagesService', () => {
    let service: SharedMessagesService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SharedMessagesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should allow adding a message and retrieve it', () => {
        const testMessage: Message = {
            username: 'User1',
            message: 'Test message',
            timeStamp: new Date(),
            isSent: true,
            isNotification: false,
        };
        service.addMessage(testMessage);

        const messages = service.getMessages();
        expect(messages.length).toBe(1);
        expect(messages[0]).toEqual(testMessage);
    });

    it('should clear messages correctly', () => {
        const testMessage: Message = {
            username: 'User1',
            message: 'Test message',
            timeStamp: new Date(),
            isSent: true,
            isNotification: false,
        };
        service.addMessage(testMessage);
        expect(service.getMessages().length).toBe(1);
        service.clearMessages();
        expect(service.getMessages().length).toBe(0);
    });

    it('should handle multiple messages correctly', () => {
        const testMessages: Message[] = [
            {
                username: 'User1',
                message: 'Test message 1',
                timeStamp: new Date(),
                isSent: true,
                isNotification: false,
            },
            {
                username: 'User2',
                message: 'Test message 2',
                timeStamp: new Date(),
                isSent: true,
                isNotification: false,
            },
        ];

        testMessages.forEach((message) => service.addMessage(message));

        const messages = service.getMessages();
        expect(messages.length).toBe(2);
        expect(messages).toEqual(testMessages);

        service.clearMessages();
        expect(service.getMessages().length).toBe(0);
    });
});

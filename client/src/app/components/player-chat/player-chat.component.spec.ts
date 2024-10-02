import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SocketClientService } from '@app/services/socket-service.service';
import { PlayerChatComponent } from './player-chat.component';

class MockSocketService {
    socket = { id: '12345' };
    send = jasmine.createSpy('send');
    connect = jasmine.createSpy('connect');

    // we needed to disable some lint to simplify some tests
    // eslint-disable-next-line @typescript-eslint/ban-types
    on = jasmine.createSpy('on').and.callFake((eventName: string, callback: Function) => {
        if (!this.eventCallbacks.has(eventName)) {
            this.eventCallbacks.set(eventName, []);
        }
        this.eventCallbacks.get(eventName)?.push(callback);
    });
    isSocketAlive = jasmine.createSpy('isSocketAlive').and.returnValue(true);
    // we needed to disable some lint to simplify some tests
    // eslint-disable-next-line @typescript-eslint/ban-types
    eventCallbacks = new Map<string, Function[]>();
    trigger(eventName: string, message: unknown) {
        if (this.eventCallbacks.has(eventName)) {
            const callbacks = this.eventCallbacks.get(eventName);
            if (callbacks) {
                callbacks.forEach((callback) => callback(message));
            }
        }
    }
    clearSocketId() {
        this.socket.id = '';
    }
    resetSocketId() {
        this.socket.id = '12345';
    }
}

describe('PlayerChatComponent', () => {
    let component: PlayerChatComponent;
    let fixture: ComponentFixture<PlayerChatComponent>;
    let mockSocketService: MockSocketService;

    beforeEach(async () => {
        mockSocketService = new MockSocketService();

        await TestBed.configureTestingModule({
            declarations: [PlayerChatComponent],
            imports: [FormsModule],
            providers: [{ provide: SocketClientService, useValue: mockSocketService }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerChatComponent);
        component = fixture.componentInstance;
        component.usernameChat = 'TestUser';
        component.roomCode = 'TestRoom';
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should send a message when sendMessage is called', () => {
        component.usernameChat = 'User1';
        component.roomCode = '1234';
        component.currentMessage = 'Hello World';
        component.sendMessage();

        expect(mockSocketService.send).toHaveBeenCalledWith('sendMessage', jasmine.any(Object));
        expect(component.currentMessage).toBe('');
    });

    it('should use "Organisateur" as sender name when sendMessage is called by organizer', () => {
        component.isOrganizer = true;
        component.roomCode = '1234';
        component.currentMessage = 'Message from organizer';

        component.sendMessage();

        expect(mockSocketService.send).toHaveBeenCalledWith('sendMessage', {
            roomCode: '1234',
            username: 'Organisateur',
            message: 'Message from organizer',
            timeStamp: jasmine.any(Date),
            isSent: true,
            isAllowedToChat: true,
        });
        expect(component.currentMessage).toBe('');
    });

    it('should return correct socket ID', () => {
        expect(component.socketId).toEqual('12345');
    });

    it('should return an empty string if there is no socket ID', () => {
        mockSocketService.clearSocketId();
        expect(component.socketId).toEqual('');
        mockSocketService.resetSocketId();
    });

    it('should send a room message and clear roomMessage', () => {
        const testRoomMessage = 'Test room message';
        component.roomMessage = testRoomMessage;
        component.sendToRoom();
        expect(mockSocketService.send).toHaveBeenCalledWith('roomMessage', testRoomMessage);
        expect(component.roomMessage).toBe('');
    });

    it('should connect to socket and configure base socket features when socket is not alive', () => {
        mockSocketService.isSocketAlive.and.returnValue(false);
        component.connect();
        expect(mockSocketService.connect).toHaveBeenCalled();
        expect(mockSocketService.on).toHaveBeenCalled();
    });
    describe('configureBaseSocketFeatures', () => {
        it('should set up socket listeners correctly', () => {
            component.configureBaseSocketFeatures();
            expect(component.socketService.on).toHaveBeenCalledTimes(2);
            expect(component.socketService.on).toHaveBeenCalledWith('blockChat', jasmine.any(Function));
            expect(component.socketService.on).toHaveBeenCalledWith('unblockChat', jasmine.any(Function));
        });

        it('should handle blockChat correctly', () => {
            component.configureBaseSocketFeatures();
            mockSocketService.trigger('blockChat', false);
            expect(component.socketService.socket.isAllowedToChat).toBeFalse();
        });

        it('should handle unblockChat correctly', () => {
            component.configureBaseSocketFeatures();
            mockSocketService.trigger('unblockChat', true);
            expect(component.isAllowedToChat).toBeTrue();
            expect(component.socketService.socket.isAllowedToChat).toBeTrue();
        });
    });
});

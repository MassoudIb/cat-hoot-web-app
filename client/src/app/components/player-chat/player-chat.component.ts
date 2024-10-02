import { Component, Input, OnInit } from '@angular/core';
import { SocketEvent } from '@app/constants/socket-event';
import { SocketClientService } from '@app/services/socket-service.service';
import { Message } from './../../interfaces/message';

@Component({
    selector: 'app-player-chat',
    templateUrl: './player-chat.component.html',
    styleUrls: ['./player-chat.component.scss'],
})
export class PlayerChatComponent implements OnInit {
    @Input() usernameChat: string = '';
    @Input() roomCode: string = '';
    @Input() roomMessages: Message[] = [];
    serverClock: Date;
    roomMessage = '';
    currentMessage: string = '';
    isOrganizer: boolean = false;
    inputFocused: boolean = false;
    isAllowedToChat: boolean = true;

    constructor(public socketService: SocketClientService) {}

    get socketId() {
        return this.socketService.socket.id ? this.socketService.socket.id : '';
    }

    sendMessage() {
        if (this.socketService.socket.isAllowedToChat || this.socketService.socket.isAllowedToChat === undefined) {
            const senderName = this.isOrganizer ? 'Organisateur' : this.usernameChat;
            this.socketService.send(SocketEvent.SEND_MESSAGE, {
                roomCode: this.roomCode,
                username: senderName,
                message: this.currentMessage,
                timeStamp: new Date(),
                isSent: true,
                isAllowedToChat: this.isAllowedToChat,
            });
            this.currentMessage = '';
        }
    }

    ngOnInit(): void {
        this.connect();
        if (this.usernameChat) {
            this.isOrganizer = this.usernameChat.toLocaleLowerCase() === 'organisateur';
        }
    }

    connect() {
        if (!this.socketService.isSocketAlive()) {
            this.socketService.connect();
            this.configureBaseSocketFeatures();
        }
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.BLOCK_CHAT, (isAllowedToChat: boolean) => {
            this.socketService.socket.isAllowedToChat = isAllowedToChat;
        });
        this.socketService.on(SocketEvent.UNBLOCK_CHAT, (isAllowedToChat: boolean) => {
            this.isAllowedToChat = true;
            this.socketService.socket.isAllowedToChat = isAllowedToChat;
        });
    }

    sendToRoom() {
        this.socketService.send(SocketEvent.ROOM_MESSAGE, this.roomMessage);
        this.roomMessage = '';
    }
}

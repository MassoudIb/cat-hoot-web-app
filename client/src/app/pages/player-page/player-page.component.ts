import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SocketEvent } from '@app/constants/socket-event';
import { Message } from '@app/interfaces/message';
import { Result } from '@app/interfaces/result';
import { DialogService } from '@app/services/dialog.service';
import { RoomsService } from '@app/services/rooms.service';
import { SharedMessagesService } from '@app/services/shared-messages-service';
import { SocketClientService } from '@app/services/socket-service.service';

@Component({
    selector: 'app-player-page',
    templateUrl: './player-page.component.html',
    styleUrls: ['./player-page.component.scss'],
})
export class PlayerPageComponent implements OnInit, OnDestroy {
    score: number = 0;
    currentQuestionIndex: unknown;
    wantToLeave: boolean | null = null;
    isTest: boolean;
    isRandom: boolean;
    roomCode: string;
    organizerName: string;
    roomMessages: Message[] = [];
    username: string;
    isGameOngoing: boolean = true;
    isAllowedToChat: boolean = true;

    // We need all these services to be injected in the constructor
    // eslint-disable-next-line max-params
    constructor(
        public socketService: SocketClientService,
        private dialogService: DialogService,
        private route: ActivatedRoute,
        private roomService: RoomsService,
        private sharedMessagesService: SharedMessagesService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        addEventListener('beforeunload', () => {
            this.ngOnDestroy();
            sessionStorage.setItem('navigating', 'false');
        });
        this.configureBaseSocketFeatures();
        this.roomCode = this.roomService.getRoomCode();
        this.route.params.subscribe((params: Params) => {
            this.isTest = params['isTest'] === 'true';
            this.username = params['username'];
            const quizId = params['quizId'];
            if (quizId.includes('randomQuiz')) this.isRandom = true;
        });
        this.roomMessages = this.sharedMessagesService.getMessages();
    }

    ngOnDestroy(): void {
        if (this.isGameOngoing) this.socketService.send(SocketEvent.PLAYER_LEFT, { username: this.username, userCode: this.roomCode });
        this.socketService.off(SocketEvent.NEW_MESSAGE);
        this.socketService.off(SocketEvent.TERMINATE_ROOM);
        this.socketService.off(SocketEvent.REDIRECT_TO_RESULT);
    }

    goToLeaveGame() {
        this.dialogService.openLeaveGame();
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.NEW_MESSAGE, (messageData: Message) => {
            if (messageData.isAllowedToChat || messageData.isAllowedToChat === undefined) {
                const formattedMessage = {
                    ...messageData,
                    timeStamp: new Date(messageData.timeStamp),
                    isSent: messageData.username === 'Organisateur',
                };
                if (formattedMessage.message !== '') {
                    this.sharedMessagesService.addMessage(formattedMessage);
                }
            }
        });

        this.socketService.on(SocketEvent.TERMINATE_ROOM, () => {
            if (this.socketService && this.socketService.socket && typeof this.socketService.socket.isAllowedToChat !== 'undefined') {
                this.socketService.socket.isAllowedToChat = true;
            }
            this.router.navigate(['/home']);
            this.dialogService.openRemovedLobbyDialog();
        });

        this.socketService.on(SocketEvent.REDIRECT_TO_RESULT, (result: Result) => {
            if (this.socketService && this.socketService.socket && typeof this.socketService.socket.isAllowedToChat !== 'undefined') {
                this.socketService.socket.isAllowedToChat = true;
            }
            this.isGameOngoing = false;
            this.router.navigate(['/resultsGame', { result, username: this.username }]);
        });
        this.socketService.on(SocketEvent.BLOCK_CHAT, (isAllowedToChat: boolean) => {
            this.isAllowedToChat = isAllowedToChat;
            this.socketService.socket.isAllowedToChat = isAllowedToChat;
        });
        this.socketService.on(SocketEvent.UNBLOCK_CHAT, (isAllowedToChat: boolean) => {
            this.isAllowedToChat = isAllowedToChat;
            this.socketService.socket.isAllowedToChat = isAllowedToChat;
        });
    }

    onScoreUpdated(updatedScore: number) {
        this.score = updatedScore;
    }
}

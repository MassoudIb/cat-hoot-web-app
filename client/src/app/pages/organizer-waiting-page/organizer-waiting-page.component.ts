import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketEvent } from '@app/constants/socket-event';
import { FIVE_SECONDS_IN_MS, ONE_SECOND_DELAY_WAITING } from '@app/constants/time';
import { Message } from '@app/interfaces/message';
import { Quiz } from '@app/interfaces/quiz';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { RoomsService } from '@app/services/rooms.service';
import { SharedMessagesService } from '@app/services/shared-messages-service';
import { SocketClientService } from '@app/services/socket-service.service';

@Component({
    selector: 'app-organizer-waiting-page',
    templateUrl: './organizer-waiting-page.component.html',
    styleUrls: ['./organizer-waiting-page.component.scss'],
})
export class OrganizerWaitingPageComponent implements OnInit, OnDestroy {
    readonly title: string = 'Attente de joueurs';
    listOfPlayers: string[] = [];
    roomCode: string = '';
    organizerName: string = 'Organisateur';
    roomMessages: Message[] = [];
    isActivateOnDestroy: boolean = true;
    isRoomLocked: boolean = false;
    quizId: string;
    id: string;
    quizTitle: string;
    quizData: Quiz[];
    isQuizRandom: boolean = false;

    // We need all those services for this component
    // eslint-disable-next-line max-params
    constructor(
        private socketService: SocketClientService,
        private router: Router,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private roomsService: RoomsService,
        private quizzesRequestService: QuizzesRequestService,
        private sharedMessagesService: SharedMessagesService,
    ) {}

    ngOnInit(): void {
        this.sharedMessagesService.clearMessages();
        this.initializeLobby();
        this.socketService.on(SocketEvent.ROOM_LOCKED_STATUS_CHANGED, (isLocked: boolean) => {
            this.isRoomLocked = isLocked;
        });
        window.onbeforeunload = () => {
            this.ngOnDestroy();
            sessionStorage.setItem('navigating', 'false');
        };
        this.route.params.subscribe((params) => {
            this.quizId = params['quizId'];
            if (this.quizId.includes('randomQuiz')) {
                this.isQuizRandom = true;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.isActivateOnDestroy) {
            this.socketService.send(SocketEvent.DELETE_ROOM, this.roomCode);
            this.socketService.send(SocketEvent.CLEAN_MAPS, this.roomCode);
            if (this.isQuizRandom) {
                const id = this.quizId.split('id=')[1];
                this.quizzesRequestService.deleteRandomQuiz(id).subscribe();
            }
        }
        this.socketService.off(SocketEvent.CREATED_ROOM);
        this.socketService.off(SocketEvent.NEW_PLAYER);
        this.socketService.off(SocketEvent.DELETE_PLAYER);
        this.socketService.off(SocketEvent.REDIRECT_TO_NEW_PAGE);
        this.socketService.off(SocketEvent.OPEN_DIALOG_BOX);
        this.socketService.off(SocketEvent.NEW_MESSAGE);
    }

    initializeLobby(): void {
        this.configureBaseSocketFeatures();
        this.socketService.send(SocketEvent.INIT_LOBBY);
    }

    configureBaseSocketFeatures(): void {
        this.socketService.on<string>(SocketEvent.CREATED_ROOM, (code) => {
            this.roomCode = code;
            this.roomsService.setRoomCode(code);
        });

        this.socketService.on<string>(SocketEvent.NEW_PLAYER, (newUsername) => {
            this.listOfPlayers.push(newUsername);
        });

        this.socketService.on<string>(SocketEvent.DELETE_PLAYER, (deletedUser) => {
            this.listOfPlayers = this.listOfPlayers.filter((user) => user !== deletedUser);
        });

        this.socketService.on<void>(SocketEvent.REDIRECT_TO_NEW_PAGE, () => {
            if (this.isQuizRandom)
                this.router.navigate(['/player', { quizId: this.quizId, roomCode: this.roomCode, isTest: false, username: 'Organisateur' }]);
            else this.router.navigate([`hostVue/${this.roomCode}/${this.quizId}`]);
        });

        this.socketService.on(SocketEvent.OPEN_DIALOG_BOX, () => {
            this.dialogService.openCountdownDialog(this.quizId);
        });

        this.socketService.on(SocketEvent.NEW_MESSAGE, (messageData: Message) => {
            const isSent = messageData.username === this.organizerName;
            const formattedMessage = {
                ...messageData,
                timeStamp: new Date(messageData.timeStamp),
                isSent,
            };
            if (formattedMessage.message !== '') {
                this.roomMessages.push(formattedMessage);
                this.sharedMessagesService.addMessage(formattedMessage);
            }
        });
    }

    redirectAll(): void {
        this.socketService.redirectAll(this.roomCode, this.quizId);
    }

    removePlayer(playerName: string): void {
        const userInfo: object = { username: playerName, userCode: this.roomCode };
        this.socketService.send(SocketEvent.PLAYER_KICKED, userInfo);
    }

    openDialogboxWaiting(): void {
        this.socketService.openDialogboxWaiting(this.roomCode, this.quizId);

        this.quizzesRequestService.getQuiz(this.quizId).subscribe((quiz) => {
            if (quiz) {
                this.quizData = [quiz];
                this.quizTitle = this.quizData[0].title;
            }
            let playerCount: number;
            if (this.isQuizRandom) playerCount = this.listOfPlayers.length + 1;
            else playerCount = this.listOfPlayers.length;
            this.socketService.sendGameStartData(this.quizTitle, playerCount, this.roomCode);
        });

        setTimeout(() => {
            this.isActivateOnDestroy = false;
            this.socketService.redirectAll(this.roomCode, this.quizId);
        }, FIVE_SECONDS_IN_MS + ONE_SECOND_DELAY_WAITING);
    }

    toggleLockRoom(): void {
        this.socketService.send(SocketEvent.TOGGLE_LOCK_ROOM, this.roomCode);
    }

    canStartGame(): boolean {
        if (this.isQuizRandom) return this.isRoomLocked;
        else return this.isRoomLocked && this.listOfPlayers.length > 0;
    }
}

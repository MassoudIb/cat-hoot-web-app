import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketEvent } from '@app/constants/socket-event';
import { Message } from '@app/interfaces/message';
import { DialogService } from '@app/services/dialog.service';
import { RoomsService } from '@app/services/rooms.service';
import { SharedMessagesService } from '@app/services/shared-messages-service';
import { SocketClientService } from '@app/services/socket-service.service';

@Component({
    selector: 'app-waiting-page',
    templateUrl: './waiting-page.component.html',
    styleUrls: ['./waiting-page.component.scss'],
})
export class WaitingPageComponent implements OnInit, OnDestroy {
    readonly title: string = 'Attente de joueurs';
    listOfPlayers: string[] = [];
    hasUsername: boolean = false;
    isUsernameValid: boolean = true;
    loginForm: FormGroup;
    username: string = '';
    roomCode: string;
    userId: object;
    roomMessages: Message[] = [];
    userInfo: object;
    isTest: boolean = false;
    quizId: string;
    activateOnDestroy: boolean = true;

    // We need all these services for this component
    // eslint-disable-next-line max-params
    constructor(
        private formBuilder: FormBuilder,
        private socketService: SocketClientService,
        private route: ActivatedRoute,
        private dialogService: DialogService,
        private router: Router,
        private roomsService: RoomsService,
        private sharedMessagesService: SharedMessagesService,
    ) {
        this.createUserForm();
    }

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.quizId = params['selectedQuizId'];
        });
        this.sharedMessagesService.clearMessages();
        this.configureBaseSocketFeatures();
        window.onbeforeunload = () => {
            sessionStorage.setItem('navigating', 'false');
            this.ngOnDestroy();
        };
        this.roomCode = this.roomsService.getRoomCode();
    }

    ngOnDestroy() {
        if (this.activateOnDestroy && this.hasUsername) {
            this.socketService.send('playerLeft', this.userInfo);
            this.socketService.send('removeId', this.userInfo);
        }
        this.socketService.off(SocketEvent.USERNAME_VALIDATED);
        this.socketService.off(SocketEvent.NEW_PLAYER);
        this.socketService.off(SocketEvent.DELETE_PLAYER);
        this.socketService.off(SocketEvent.LIST_OF_PLAYERS);
        this.socketService.off(SocketEvent.NEW_MESSAGE);
        this.socketService.off(SocketEvent.REDIRECT_TO_NEW_PAGE);
        this.socketService.off(SocketEvent.OPEN_DIALOG_BOX);
        this.socketService.off(SocketEvent.TERMINATE_ROOM);
        this.socketService.off(SocketEvent.WAS_KICKED);
        this.socketService.off(SocketEvent.ROOM_UNAVAILABLE);
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.USERNAME_VALIDATED, (isUsernameValid: boolean) => {
            if (isUsernameValid) {
                this.hasUsername = true;
                this.socketService.send(SocketEvent.JOIN_ROOM, { username: this.username, roomCode: this.roomCode });
            } else this.isUsernameValid = false;
        });

        this.socketService.on(SocketEvent.NEW_PLAYER, (newUsername: string) => {
            this.listOfPlayers.push(newUsername);
        });

        this.socketService.on(SocketEvent.DELETE_PLAYER, (deletedUser: string) => {
            this.listOfPlayers = this.listOfPlayers.filter((user) => user !== deletedUser);
        });

        this.socketService.on(SocketEvent.NEW_MESSAGE, (messageData: Message) => {
            const formattedMessage = {
                ...messageData,
                timeStamp: new Date(messageData.timeStamp),
                isSent: messageData.username === 'Organisateur',
            };
            if (formattedMessage.message !== '') {
                this.sharedMessagesService.addMessage(formattedMessage);
                this.roomMessages.push(formattedMessage);
            }
        });

        this.socketService.on(SocketEvent.LIST_OF_PLAYERS, (players: string[]) => {
            this.listOfPlayers = players;
        });

        this.socketService.on(SocketEvent.REDIRECT_TO_NEW_PAGE, (quizId: string) => {
            this.activateOnDestroy = false;
            this.router.navigate(['/player', { quizId, roomCode: this.roomCode, isTest: this.isTest, username: this.username }]);
        });

        this.socketService.on(SocketEvent.OPEN_DIALOG_BOX, (quizId: string) => {
            this.dialogService.openCountdownDialog(quizId);
        });

        this.socketService.on(SocketEvent.WAS_KICKED, () => {
            this.activateOnDestroy = false;
            this.socketService.send('removeId', this.userInfo);
            this.disconnectUser();
            this.dialogService.openKickedPlayerDialog();
        });

        this.socketService.on(SocketEvent.TERMINATE_ROOM, () => {
            this.disconnectUser();
            this.dialogService.openRemovedLobbyDialog();
        });

        this.socketService.on(SocketEvent.ROOM_UNAVAILABLE, () => {
            this.activateOnDestroy = false;
            this.disconnectUser();
            this.dialogService.openUnavailableGame();
        });
    }

    createUserForm() {
        this.loginForm = this.formBuilder.group({
            username: [''],
        });
    }

    validateUsername() {
        this.username = this.loginForm.value.username.trim();
        if (this.username) {
            this.userInfo = { username: this.username, userCode: this.roomCode };
            this.socketService.send(SocketEvent.VALIDATE_USERNAME, this.userInfo);
        } else this.isUsernameValid = false;
    }

    disconnectUser() {
        this.socketService.disconnect();
        this.router.navigate(['/']);
        this.socketService.connect();
    }
}

import { Injectable } from '@angular/core';
import { ColorCode } from '@app/constants/color-code';
import { SocketEvent } from '@app/constants/socket-event';
import { Player } from '@app/interfaces/player';
import { SocketClientService } from './socket-service.service';

const GREATER = -1;
const SMALLER = 1;
@Injectable({
    providedIn: 'root',
})
export class PlayerInteractionService {
    isGameFinished: boolean = false;
    isQuestionFinished: boolean = false;
    isTimeOver: boolean = false;
    isReadyForNextQuestion: boolean = false;
    isNameAscending: boolean = false;
    isScoreAscending: boolean = false;
    isColorStateAscending: boolean = false;

    time: number = 0;
    score: number = 0;
    currentQuestionIndex: number = 0;

    listOfPlayers: Player[] = [];
    roomCode: string = '';
    organizerName: string = 'Organisateur';

    constructor(private socketService: SocketClientService) {}
    configureBaseSocketFeatures() {
        this.handleInteractionEvents();
        this.handleScoreEvents();
        this.handlePlayersEvents();
    }
    handlePlayersEvents() {
        this.socketService.on<string>(SocketEvent.DELETE_PLAYER, (deletedUser: string) => {
            this.listOfPlayers = this.listOfPlayers.map((user) => {
                if (user.name === deletedUser) {
                    return { ...user, isPlaying: false, colorState: ColorCode.HAS_LEFT };
                }
                return user;
            });
        });

        this.socketService.on(SocketEvent.ANSWER_WITH_LIST_OF_PLAYERS, (listOfPlayers: string[]) => {
            this.listOfPlayers = [
                ...this.listOfPlayers,
                ...listOfPlayers.map((username) => ({
                    name: username,
                    score: 0,
                    isPlaying: true,
                    colorState: ColorCode.HAS_NO_INTERACTION,
                    isAllowedToChat: true,
                })),
            ];
        });
    }

    handleScoreEvents() {
        this.socketService.on(SocketEvent.UPDATE_SCORE, (player: Player) => {
            this.listOfPlayers.map((playerInGame) => {
                if (playerInGame.name === player.name) {
                    playerInGame.score = player.score;
                }
            });
            this.sortPlayersByScore();
        });
    }

    handleInteractionEvents() {
        this.socketService.on(SocketEvent.INTERACTION, (playerInteraction: { username: string; colorCode: string }) => {
            this.listOfPlayers.map((player) => {
                if (player.isPlaying) {
                    if (player.name === playerInteraction.username) player.colorState = playerInteraction.colorCode;
                }
            });
            this.sortPlayersByColorState();
        });
    }

    initializeLobby(roomCode: string) {
        this.roomCode = roomCode;
        this.socketService.joinRoom(roomCode);
        this.socketService.requestForListOfPlayers(roomCode);
    }

    cleanOnDestroy() {
        this.socketService.off(SocketEvent.DELETE_PLAYER);
        this.socketService.off(SocketEvent.ANSWER_WITH_LIST_OF_PLAYERS);
        this.socketService.off(SocketEvent.INTERACTION);
        this.socketService.off(SocketEvent.UPDATE_SCORE);
    }

    handleChatPrivilege(player: Player, isAllowedToChat: boolean) {
        this.socketService.handleChatPrivilege(this.roomCode, player.name, isAllowedToChat);
        this.toggleChatPrivilege(player);
    }

    sortPlayersByName() {
        this.listOfPlayers.sort((playerA, playerB) => {
            const nameA = playerA.name.toLowerCase();
            const nameB = playerB.name.toLowerCase();
            if (this.isNameAscending) {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });
    }

    sortPlayersByScore() {
        this.listOfPlayers.sort((playerA, playerB) => {
            if (this.isScoreAscending) {
                return playerA.score - playerB.score === 0 ? this.localeCompare(playerA, playerB) : playerA.score - playerB.score;
            }
            return playerB.score - playerA.score === 0 ? this.localeCompare(playerA, playerB) : playerB.score - playerA.score;
        });
    }
    sortPlayersByColorState() {
        if (this.isColorStateAscending) this.sortPlayerByAscendingState();
        else this.sortPlayerByDescendingState();
    }

    sortPlayerByAscendingState() {
        this.listOfPlayers.sort((playerA, playerB) => {
            if (this.isColorStateTheSame(playerA, playerB)) return this.localeCompare(playerA, playerB);

            if (playerA.colorState === ColorCode.HAS_NO_INTERACTION) return GREATER;

            if (this.isInteractionVsNoInteraction(playerA, playerB)) return SMALLER;
            if (this.isInteractionVsSubmittedOrLeft(playerA, playerB)) return GREATER;
            if (this.isSubmittedVsInteractionOrNoInteraction(playerA, playerB)) return SMALLER;
            if (this.isSubmittedVsLeft(playerA, playerB)) return GREATER;
            if (playerA.colorState === ColorCode.HAS_LEFT) return SMALLER;

            return playerA.name.localeCompare(playerB.name);
        });
    }

    sortPlayerByDescendingState() {
        this.listOfPlayers.sort((playerA, playerB) => {
            if (this.isColorStateTheSame(playerA, playerB)) return this.localeCompare(playerA, playerB);

            if (playerB.colorState === ColorCode.HAS_NO_INTERACTION) return GREATER;

            if (this.isInteractionVsNoInteraction(playerB, playerA)) return SMALLER;
            if (this.isInteractionVsSubmittedOrLeft(playerB, playerA)) return GREATER;
            if (this.isSubmittedVsInteractionOrNoInteraction(playerB, playerA)) return SMALLER;
            if (this.isSubmittedVsLeft(playerB, playerA)) return GREATER;
            if (playerB.colorState === ColorCode.HAS_LEFT) return SMALLER;

            return playerB.name.localeCompare(playerA.name);
        });
    }

    toggleChatPrivilege(player: Player) {
        player.isAllowedToChat = !player.isAllowedToChat;
    }

    private isColorStateTheSame(playerA: Player, playerB: Player) {
        return playerA.colorState === playerB.colorState;
    }
    private localeCompare(playerA: Player, playerB: Player) {
        const nameA = playerA.name.toLowerCase();
        const nameB = playerB.name.toLowerCase();
        return nameA.localeCompare(nameB);
    }

    private isInteractionVsNoInteraction(playerA: Player, playerB: Player) {
        return playerA.colorState === ColorCode.HAS_INTERACTION && playerB.colorState === ColorCode.HAS_NO_INTERACTION;
    }
    private isInteractionVsSubmittedOrLeft(playerA: Player, playerB: Player) {
        return playerA.colorState === ColorCode.HAS_INTERACTION && (playerB.colorState === ColorCode.HAS_SUBMITTED || ColorCode.HAS_LEFT);
    }

    private isSubmittedVsInteractionOrNoInteraction(playerA: Player, playerB: Player) {
        return playerA.colorState === ColorCode.HAS_SUBMITTED && playerB.colorState === (ColorCode.HAS_INTERACTION || ColorCode.HAS_NO_INTERACTION);
    }
    private isSubmittedVsLeft(playerA: Player, playerB: Player) {
        return playerA.colorState === ColorCode.HAS_SUBMITTED && playerB.colorState === ColorCode.HAS_LEFT;
    }
}

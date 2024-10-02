import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FOUR_DIGITS } from '@app/constants/results-game';
import { SocketEvent } from '@app/constants/socket-event';
import { DataQrlCorrection } from '@app/interfaces/list-qrl-answer';
import { Message } from '@app/interfaces/message';
import { Result } from '@app/interfaces/result';
import { GameService } from '@app/services/game.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { RoomsService } from '@app/services/rooms.service';
import { SharedMessagesService } from '@app/services/shared-messages-service';
import { SocketClientService } from '@app/services/socket-service.service';
import { Subscription } from 'rxjs';

const CONFETTI_DURATION = 1000;
@Component({
    selector: 'app-results-game-page',
    templateUrl: './results-game-page.component.html',
    styleUrls: ['./results-game-page.component.scss'],
})
export class ResultsGamePageComponent implements OnInit, OnDestroy, AfterViewInit {
    sortedListOfPlayersWithDetails: { username: string; scores: number[]; bonusAmounts: number[] }[] = [];
    listOfResults: Result[];
    listOfCorrection: DataQrlCorrection[];
    quizId: string;
    roomCode: string;
    roomMessages: Message[] = [];
    username: string;
    activeTab: string = 'Podium';
    results: Result[];
    resultIndex: number = 0;
    topScore: number;
    isQuizRandom: boolean = false;
    gameId: string;
    private paramsSubscription: Subscription;
    // We need all these services to be injected in the constructor
    // eslint-disable-next-line max-params
    constructor(
        private socketService: SocketClientService,
        private route: ActivatedRoute,
        private roomsService: RoomsService,
        protected gameService: GameService,
        private sharedMessagesService: SharedMessagesService,
        private quizzesRequestService: QuizzesRequestService,
        private router: Router,
        private elRef: ElementRef,
        private renderer: Renderer2,
    ) {}

    openTab(tabName: string): void {
        this.activeTab = tabName;
    }

    ngOnInit(): void {
        this.playPodiumSound();
        this.configureBaseSocketFeatures();
        this.roomCode = this.roomsService.getRoomCode();
        this.isQuizRandom = this.roomsService.getRoomMode();
        this.gameId = this.roomsService.getRoomId();
        this.paramsSubscription = this.route.params.subscribe((params: Params) => {
            this.username = params['username'];
        });
        this.socketService.getDataPlayers(this.roomCode);
        if (!this.isQuizRandom) this.socketService.getDataCorrectionQrl(this.roomCode);
        else this.socketService.getDataResults(this.roomCode);
        this.roomMessages = this.sharedMessagesService.getMessages();
        if (this.isQuizRandom) this.quizzesRequestService.deleteRandomQuiz(this.gameId).subscribe();

        window.onbeforeunload = () => {
            this.ngOnDestroy();
            sessionStorage.setItem('navigating', 'false');
        };
        this.paramsSubscription.unsubscribe();
    }

    ngOnDestroy(): void {
        this.socketService.leaveRoom(this.roomCode);
        this.socketService.off(SocketEvent.LIST_OF_PLAYERS_WITH_DETAILS);
        this.socketService.off(SocketEvent.NEW_MESSAGE);
        this.socketService.off(SocketEvent.LIST_OF_PLAYERS_WITH_RESULT);
        this.socketService.off(SocketEvent.LIST_OF_DATA_CORRECTION_QRL);
        this.sharedMessagesService.clearMessages();
        setTimeout(() => {
            this.topScore = this.calculateTopScore();
            this.socketService.sendGameEndData(this.topScore, this.roomCode);
        }, CONFETTI_DURATION);
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.renderer.addClass(this.elRef.nativeElement.querySelector('.first-place'), 'rise');
            this.renderer.addClass(this.elRef.nativeElement.querySelector('.second-place'), 'rise');
            this.renderer.addClass(this.elRef.nativeElement.querySelector('.third-place'), 'rise');
        }, 0);
    }
    disconnectUser() {
        this.socketService.disconnect();
        this.router.navigate(['/home']);
        this.socketService.connect();
    }
    viewResultFromPreviousQuestion() {
        if (this.resultIndex > 0) {
            this.gameService.updateResultFromSocket(this.listOfResults[--this.resultIndex]);
        }
    }

    viewResultFromNextQuestion() {
        if (this.resultIndex < this.listOfResults.length - 1) {
            this.gameService.updateResultFromSocket(this.listOfResults[++this.resultIndex]);
        }
    }
    playPodiumSound(): void {
        const audio = document.getElementById('podiumSound') as HTMLAudioElement;
        audio.play();
    }

    addQrlDataToListOfResults(resultsData: Result[]) {
        if (this.listOfCorrection) {
            this.listOfCorrection.forEach((correction) => {
                const newResult: Result = {
                    text: correction.questionTitle,
                    choices: [
                        { choice: 'Nombre de joueurs ayant obtenu la note 100 %', isCorrect: true, numberOfAnswers: correction.amount100 },
                        { choice: 'Nombre de joueurs ayant obtenu la note 50 %', isCorrect: true, numberOfAnswers: correction.amount50 },
                        { choice: 'Nombre de joueurs ayant obtenu la note 0 %', isCorrect: false, numberOfAnswers: correction.amount0 },
                    ],
                };
                resultsData.splice(correction.questionIndex, 1, newResult);
            });
        }

        return resultsData;
    }

    configureBaseSocketFeatures() {
        this.socketService.on(
            SocketEvent.LIST_OF_PLAYERS_WITH_DETAILS,
            (playerArray: { username: string; scores: number[]; bonusAmounts: number[] }[]) => {
                this.sortedListOfPlayersWithDetails = playerArray;

                this.sortedListOfPlayersWithDetails.forEach((player) => {
                    player.username = player.username.substring(FOUR_DIGITS);
                });

                for (let i = 0; i < this.sortedListOfPlayersWithDetails.length; i++) {
                    for (let j = 0; j < this.sortedListOfPlayersWithDetails.length - i - 1; j++) {
                        const totalScore = this.sortedListOfPlayersWithDetails[j].scores.reduce((acc, score) => acc + score, 0);
                        const totalScoreSuivant = this.sortedListOfPlayersWithDetails[j + 1].scores.reduce((acc, score) => acc + score, 0);
                        if (totalScoreSuivant > totalScore) {
                            const temp = this.sortedListOfPlayersWithDetails[j + 1];
                            this.sortedListOfPlayersWithDetails[j + 1] = this.sortedListOfPlayersWithDetails[j];
                            this.sortedListOfPlayersWithDetails[j] = temp;
                        } else if (totalScoreSuivant === totalScore) {
                            const nameA = this.sortedListOfPlayersWithDetails[j].username.toUpperCase();
                            const nameB = this.sortedListOfPlayersWithDetails[j + 1].username.toUpperCase();
                            if (nameA > nameB) {
                                const temp = this.sortedListOfPlayersWithDetails[j + 1];
                                this.sortedListOfPlayersWithDetails[j + 1] = this.sortedListOfPlayersWithDetails[j];
                                this.sortedListOfPlayersWithDetails[j] = temp;
                            }
                        }
                    }
                }
            },
        );

        this.socketService.on(SocketEvent.NEW_MESSAGE, (messageData: Message) => {
            const formattedMessage = {
                ...messageData,
                timeStamp: new Date(messageData.timeStamp),
                isSent: messageData.username === 'Organisateur',
            };
            if (formattedMessage.message !== '') this.roomMessages.push(formattedMessage);
        });

        this.socketService.on(SocketEvent.LIST_OF_DATA_CORRECTION_QRL, (correctionData: DataQrlCorrection[]) => {
            this.listOfCorrection = correctionData;
            this.socketService.getDataResults(this.roomCode);
        });

        this.socketService.on(SocketEvent.LIST_OF_PLAYERS_WITH_RESULT, (resultsData: Result[]) => {
            this.listOfResults = this.addQrlDataToListOfResults(resultsData);
            this.gameService.updateResultFromSocket(this.listOfResults[0]);
        });
    }

    calculateTopScore(): number {
        return this.sortedListOfPlayersWithDetails[0]?.scores.reduce((a, b) => a + b, 0) ?? 0;
    }
}

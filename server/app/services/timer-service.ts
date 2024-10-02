import { ONE_SECOND_WAITING, QUARTER_SECOND } from '@app/constants/data';
import { Server } from 'socket.io';

export class TimerService {
    durations = new Map<string, number>();
    panicModeActive = new Map<string, boolean>();
    timers = new Map<string, NodeJS.Timeout>();

    constructor(private io: Server) {}

    pauseTimerForRoom(roomCode: string) {
        if (this.timers.has(roomCode)) {
            clearInterval(this.timers.get(roomCode));
        }
        this.io.to(roomCode).emit('panicModePaused');
    }
    resumeTimerForRoom(roomCode: string) {
        const panicMode = this.panicModeActive.get(roomCode);
        if (this.timers.has(roomCode)) {
            this.startTimerForRoom(roomCode, this.durations.get(roomCode), panicMode);
        }
        if (this.panicModeActive.get(roomCode)) {
            this.io.to(roomCode).emit('panicModeResumed');
        }
    }

    startPanicModeForRoom(roomCode: string) {
        this.panicModeActive.set(roomCode, true);
        this.startTimerForRoom(roomCode, this.durations.get(roomCode), true);
    }
    resetPanicModeForRoom(roomCode: string) {
        this.panicModeActive.set(roomCode, false);
    }

    startTimerForRoom(roomCode: string, durationInSeconds: number, panicMode = false) {
        this.resetPanicModeForRoom(roomCode);
        this.panicModeActive.set(roomCode, panicMode);
        if (this.timers.has(roomCode)) {
            this.stopTimerForRoom(roomCode);
        }

        this.durations.set(roomCode, durationInSeconds);

        const interval = panicMode ? QUARTER_SECOND : ONE_SECOND_WAITING;

        const timer = setInterval(() => {
            const remainingTime = this.durations.get(roomCode);
            if (remainingTime >= 0) {
                this.io.to(roomCode).emit('timerUpdated', remainingTime);
                this.durations.set(roomCode, remainingTime - 1);
            } else {
                clearInterval(timer);
                this.timers.delete(roomCode);
                this.durations.delete(roomCode);
                this.io.to(roomCode).emit('timerExpired');
                this.stopTimerForRoom(roomCode);
            }
        }, interval);

        this.timers.set(roomCode, timer);
    }

    stopTimerForRoom(roomCode: string) {
        if (this.timers.has(roomCode)) {
            clearInterval(this.timers.get(roomCode));
            this.timers.delete(roomCode);
            this.durations.delete(roomCode);
        }
    }
}

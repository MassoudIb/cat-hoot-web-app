import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class TimeService {
    timerExpired = new EventEmitter<void>();
    isPaused: boolean = false;
    private interval: number | undefined;
    private readonly tick = 1000;
    private counter = 0;

    get time() {
        return this.counter;
    }

    private set time(newTime: number) {
        this.counter = newTime;
    }

    startTimer(startValue: number) {
        if (this.interval) return;
        this.isPaused = false;
        this.time = startValue;
        this.interval = window.setInterval(() => {
            if (this.time > 0) {
                this.time--;
            } else {
                this.stopTimer();
                this.timerExpired.emit();
            }
        }, this.tick);
    }

    stopTimer() {
        clearInterval(this.interval);
        this.interval = undefined;
        this.isPaused = false;
    }
}

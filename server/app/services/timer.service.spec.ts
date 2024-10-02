/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-invalid-this */
// we disable some lint to simplify some test
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { BroadcastOperator, Server as MockServer } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { TimerService } from './timer-service';

const RESPONSE_DELAY = 1000;
const LONGER_RESPONSE_DELAY = 5000;
describe('TimerService', () => {
    let timerService: TimerService;
    let mockIo: MockServer<DefaultEventsMap, DefaultEventsMap>;
    beforeEach(() => {
        mockIo = new MockServer();
        sinon.stub(mockIo, 'to').returns(mockIo as unknown as BroadcastOperator<DefaultEventsMap, DefaultEventsMap>);
        timerService = new TimerService(mockIo);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should create a new instance of TimerService', () => {
        expect(timerService).to.be.instanceOf(TimerService);
    });
    it('should pause a running timer for a room', () => {
        const roomCode = 'testRoomPause';
        const durationInSeconds = 5;
        timerService.startTimerForRoom(roomCode, durationInSeconds);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');
        timerService.pauseTimerForRoom(roomCode);
        sinon.assert.calledOnce(clearIntervalSpy);
        clearIntervalSpy.restore();
    });

    it('should resume a paused timer for a room', function (done) {
        this.timeout(LONGER_RESPONSE_DELAY + RESPONSE_DELAY);
        const roomCode = 'testRoomResume';
        const durationInSeconds = 3;
        const setIntervalSpy = sinon.spy(global, 'setInterval');
        const emitSpy = sinon.spy(mockIo, 'emit');
        timerService.startTimerForRoom(roomCode, durationInSeconds);
        timerService.pauseTimerForRoom(roomCode);
        timerService.resumeTimerForRoom(roomCode);
        setTimeout(() => {
            sinon.assert.calledTwice(setIntervalSpy);
            sinon.assert.calledWith(emitSpy, 'timerUpdated', sinon.match.any);
            setIntervalSpy.restore();
            emitSpy.restore();
            done();
        }, RESPONSE_DELAY);
    });

    it('should activate panic mode for a room and start the timer in panic mode', () => {
        const roomCode = 'testRoomPanic';
        const durationInSeconds = 5;
        timerService.durations.set(roomCode, durationInSeconds);
        const startTimerSpy = sinon.spy(timerService, 'startTimerForRoom');
        timerService.startPanicModeForRoom(roomCode);
        sinon.assert.calledWith(startTimerSpy, roomCode, durationInSeconds, true);
        startTimerSpy.restore();
    });

    it('should clear the timer for a room when paused', () => {
        const roomCode = 'testRoomPause';
        const durationInSeconds = 5;
        timerService.startTimerForRoom(roomCode, durationInSeconds);
        const clearIntervalSpy = sinon.spy(global, 'clearInterval');
        timerService.pauseTimerForRoom(roomCode);
        sinon.assert.calledOnce(clearIntervalSpy);
        clearIntervalSpy.restore();
    });

    it('should initiate a timer and emit "timerUpdated" events', (done) => {
        const roomCode = 'testRoom';
        const durationInSeconds = 5;

        const emitSpy = sinon.spy(mockIo, 'emit');
        timerService.startTimerForRoom(roomCode, durationInSeconds);

        setTimeout(() => {
            sinon.assert.calledWith(emitSpy, 'timerUpdated', sinon.match.any);
            done();
        }, LONGER_RESPONSE_DELAY);
    });

    it('should not pause the timer when the room code is empty', () => {
        const roomCode = '';
        timerService.pauseTimerForRoom(roomCode);
        expect(timerService.timers.size).to.equal(0);
    });

    it('should resume the timer for a room with the correct duration and panic mode', () => {
        const roomCode = 'testRoom';
        const durationInSeconds = 60;
        const isPanicMode = true;
        timerService.durations.set(roomCode, durationInSeconds);
        timerService.panicModeActive.set(roomCode, isPanicMode);

        timerService.timers.set(
            roomCode,
            setTimeout(() => {}, RESPONSE_DELAY),
        );

        const startTimerForRoomSpy = sinon.spy(timerService, 'startTimerForRoom');
        timerService.resumeTimerForRoom(roomCode);
        sinon.assert.calledWith(startTimerForRoomSpy, roomCode, durationInSeconds, isPanicMode);
        timerService.stopTimerForRoom(roomCode);
        startTimerForRoomSpy.restore();
    });

    it('should not attempt to resume a timer when none exists for the room', () => {
        const roomCode = 'noTimerRoom';
        assert.strictEqual(timerService.timers.has(roomCode), false);
        const startTimerForRoomSpy = sinon.spy(timerService, 'startTimerForRoom');
        timerService.resumeTimerForRoom(roomCode);
        sinon.assert.notCalled(startTimerForRoomSpy);
        startTimerForRoomSpy.restore();
    });

    it('should stop a running timer', () => {
        const roomCode = 'testRoom';
        const durationInSeconds = 5;

        const emitSpy = sinon.spy(mockIo, 'emit');
        timerService.startTimerForRoom(roomCode, durationInSeconds);
        timerService.stopTimerForRoom(roomCode);

        sinon.assert.notCalled(emitSpy.withArgs('timerUpdated', sinon.match.any));
    });

    it('should stop an existing timer for the room before starting a new one', (done) => {
        const roomCode = 'testRoom';
        const durationInSeconds = 5;

        timerService.startTimerForRoom(roomCode, durationInSeconds);

        setTimeout(() => {
            const emitSpy = sinon.spy(mockIo, 'emit');
            timerService.startTimerForRoom(roomCode, durationInSeconds);

            setTimeout(() => {
                sinon.assert.calledOnce(emitSpy.withArgs('timerUpdated', sinon.match.any));
                emitSpy.restore();
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });
    it('should stop a running timer when the duration is 0', (done) => {
        const roomCode = 'testRoom';
        const durationInSeconds = 1;

        const emitSpy = sinon.spy(mockIo, 'emit');
        timerService.startTimerForRoom(roomCode, durationInSeconds);

        setTimeout(() => {
            sinon.assert.calledWith(emitSpy, 'timerUpdated');
            done();
        }, RESPONSE_DELAY);
    });
});

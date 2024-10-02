type CallbackSignature = (params: unknown) => object;

export class SocketTestHelper {
    private callbacks = new Map<string, CallbackSignature[]>();
    emit(event: string, ...args: unknown[]): void {
        // We need the console log for the tests
        // eslint-disable-next-line no-console
        console.log(`Emit called with event: ${event} and args:`, args);
    }
    on(event: string, callback: CallbackSignature): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }

        this.callbacks.get(event)?.push(callback);
    }
    disconnect(): void {
        return;
    }

    peerSideEmit(event: string) {
        if (!this.callbacks.has(event)) {
            return;
        }
    }
    off(event: string): void {
        this.callbacks.delete(event);
    }
}

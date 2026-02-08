export type InputCallback = (action: string) => void;

export class InputHandler {
  private keyMap: Record<string, string> = {
    ArrowLeft: "left",
    ArrowDown: "down",
    ArrowUp: "up",
    ArrowRight: "right",
    // WASD alternatives
    KeyA: "left",
    KeyS: "down",
    KeyW: "up",
    KeyD: "right",
  };

  private pressedKeys: Set<string> = new Set();
  private onPressCallback: InputCallback | null = null;
  private onReleaseCallback: InputCallback | null = null;

  constructor() {
    // defer listener attachment to start()
  }

  start(onPress: InputCallback, onRelease: InputCallback) {
    this.onPressCallback = onPress;
    this.onReleaseCallback = onRelease;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  isDown(action: string): boolean {
    for (const code of this.pressedKeys) {
      if (this.keyMap[code] === action) return true;
    }
    return false;
  }

  stop() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.pressedKeys.clear();
    this.onPressCallback = null;
    this.onReleaseCallback = null;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.pressedKeys.has(event.code)) return; // Ignore repeat
    const action = this.keyMap[event.code];
    if (action) {
      this.pressedKeys.add(event.code);
      if (this.onPressCallback) {
        this.onPressCallback(action);
      }
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    const action = this.keyMap[event.code];
    if (action) {
      this.pressedKeys.delete(event.code);
      if (this.onReleaseCallback) {
        this.onReleaseCallback(action);
      }
    }
  };
}

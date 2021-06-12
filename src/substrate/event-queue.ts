export class EventQueue<T> {
  private events: T[] = [];
  private handler: (e: T) => Promise<void>;
  private handling: boolean = false;

  constructor(handler: (e: T) => Promise<void>) {
    this.handler = handler;
  }
  
  public async push(e?: T, handle: boolean = true): Promise<void> {
    if (e) {
      this.events.push(e);
    }

    if (handle && !this.handling) {
      this.handling = true;

      while (this.events.length > 0) {
        const events = this.events;
        this.events = []

        for (const event of events) {
          await this.handler(event);
        }
      }

      this.handling = false;
    }
  }
}
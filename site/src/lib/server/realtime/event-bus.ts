/**
 * In-memory pub/sub event bus for real-time server-sent events.
 *
 * Each "channel" is identified by a string key (e.g. adventure ID).
 * Subscribers receive (event, data) callbacks whenever something is
 * emitted on that channel.  The returned unsubscribe function removes
 * the listener and cleans up empty channels automatically.
 */

export type EventCallback = (event: string, data: unknown) => void;

class EventBus {
	private channels = new Map<string, Set<EventCallback>>();

	/** Subscribe to a channel. Returns an unsubscribe function. */
	subscribe(channel: string, callback: EventCallback): () => void {
		if (!this.channels.has(channel)) {
			this.channels.set(channel, new Set());
		}
		this.channels.get(channel)!.add(callback);

		return () => {
			const subs = this.channels.get(channel);
			if (subs) {
				subs.delete(callback);
				if (subs.size === 0) this.channels.delete(channel);
			}
		};
	}

	/** Emit an event to every subscriber on a channel. */
	emit(channel: string, event: string, data: unknown): void {
		const subs = this.channels.get(channel);
		if (!subs) return;
		for (const cb of subs) {
			try {
				cb(event, data);
			} catch {
				// Individual listener errors must not break the broadcast
			}
		}
	}

	/** Number of active subscribers on a channel (useful for debugging). */
	subscriberCount(channel: string): number {
		return this.channels.get(channel)?.size ?? 0;
	}
}

/** Singleton event bus shared across the entire server process. */
export const eventBus = new EventBus();

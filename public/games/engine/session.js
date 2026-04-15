/**
 * session.js — lightweight PartyKit client wrapper.
 *
 * Usage:
 *   import { Session } from './session.js';
 *   const session = new Session('larrydanna-games.larry.partykit.dev');
 *   session.on('state', (sessionState, yourId) => { ... });
 *   session.on('error', (msg) => { ... });
 *   session.connect(roomId);
 *   session.send({ type: 'JOIN_SESSION', ... });
 */

export class Session extends EventTarget {
  constructor(host) {
    super();
    this.host = host;
    this.ws   = null;
    this._reconnectTimer = null;
    this._roomId = null;
    this._shouldReconnect = true;
  }

  connect(roomId) {
    this._roomId = roomId.toUpperCase();
    this._shouldReconnect = true;
    this._open();
  }

  _open() {
    clearTimeout(this._reconnectTimer);
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const url = `${isLocal ? 'ws' : 'wss'}://${this.host}/parties/main/${this._roomId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.dispatchEvent(new CustomEvent('open'));
    };

    this.ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }
      if (msg.type === 'STATE') {
        this.dispatchEvent(new CustomEvent('state', { detail: { session: msg.session, yourId: msg.yourId } }));
      } else if (msg.type === 'ERROR') {
        this.dispatchEvent(new CustomEvent('error', { detail: msg.error }));
      }
    };

    this.ws.onerror = () => {
      this.dispatchEvent(new CustomEvent('connectionerror'));
    };

    this.ws.onclose = () => {
      if (this._shouldReconnect) {
        this.dispatchEvent(new CustomEvent('reconnecting'));
        this._reconnectTimer = setTimeout(() => this._open(), 3000);
      }
    };
  }

  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  disconnect() {
    this._shouldReconnect = false;
    clearTimeout(this._reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  // Convenience: add event listener with cleaner API
  on(event, handler) {
    this.addEventListener(event, (e) => handler(e.detail ?? e));
    return this;
  }
}

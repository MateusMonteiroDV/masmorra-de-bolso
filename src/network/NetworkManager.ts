import { joinRoom, selfId } from 'trystero/nostr';
import { PlayerNetworkState, PlayerNetworkAction, RoomInfo } from './NetworkTypes';

type StateListener = (state: PlayerNetworkState, peerId: string) => void;
type ActionListener = (action: PlayerNetworkAction, peerId: string) => void;
type PeerListener = (peerId: string) => void;
type RoomChangeListener = (roomId: string | null) => void;

// Relays Nostr públicos, rápidos e verificados sem exigência de autenticação (AUTH)
const VERIFIED_NOSTR_RELAYS = [
  'wss://nos.lol',
  'wss://purplerelay.com',
  'wss://relay.primal.net',
  'wss://nostr.sathoarder.com',
  'wss://yabu.me/v2',
  'wss://nostr.data.haus'
];

class NetworkManagerClass {
  public selfId: string = selfId;
  public currentRoomId: string | null = null;
  public isHost: boolean = false;
  public connectedPeers: Set<string> = new Set();

  private room: any = null;
  private stateAction: any = null;
  private actionAction: any = null;

  // Canal local via BroadcastChannel para testes instantâneos no mesmo computador/navegador
  private localChannel: BroadcastChannel | null = null;
  private localHeartbeatTimer: number | null = null;

  private stateListeners: Set<StateListener> = new Set();
  private actionListeners: Set<ActionListener> = new Set();
  private peerJoinListeners: Set<PeerListener> = new Set();
  private peerLeaveListeners: Set<PeerListener> = new Set();
  private roomChangeListeners: Set<RoomChangeListener> = new Set();

  public isConnected(): boolean {
    return this.connectedPeers.size > 0;
  }

  public getRoomInfo(): RoomInfo {
    return {
      roomId: this.currentRoomId || '',
      isHost: this.isHost,
      connectedPeers: Array.from(this.connectedPeers)
    };
  }

  public join(roomId: string, asHost: boolean = false): void {
    if (this.room || this.localChannel) {
      this.leave();
    }

    const cleanRoomId = roomId.trim().toUpperCase();
    this.currentRoomId = cleanRoomId;
    this.isHost = asHost;
    this.roomChangeListeners.forEach(listener => listener(cleanRoomId));

    // 1. Conexão WebRTC P2P Global via Trystero Nostr com relays verificados
    try {
      const config = {
        appId: 'masmorra-de-bolso-p2p',
        relayConfig: {
          urls: VERIFIED_NOSTR_RELAYS,
          redundancy: 4,
          warnOnRelayFailure: false
        },
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      };

      this.room = joinRoom(config, cleanRoomId);

      this.stateAction = this.room.makeAction('pState');
      this.actionAction = this.room.makeAction('pAction');

      this.room.onPeerJoin = (peerId: string) => {
        this.handlePeerJoin(peerId);
      };

      this.room.onPeerLeave = (peerId: string) => {
        this.handlePeerLeave(peerId);
      };

      this.stateAction.onMessage = (data: PlayerNetworkState, { peerId }: { peerId: string }) => {
        this.stateListeners.forEach(listener => listener(data, peerId));
      };

      this.actionAction.onMessage = (data: PlayerNetworkAction, { peerId }: { peerId: string }) => {
        this.actionListeners.forEach(listener => listener(data, peerId));
      };
    } catch (err) {
      console.warn('[P2P WebRTC] Aviso ao inicializar sala:', err);
    }

    // 2. Ponte de Canal Local (BroadcastChannel)
    // Permite testar duas abas no mesmo notebook com latência zero e 100% de confiabilidade imediata
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.localChannel = new BroadcastChannel(`mdb_room_${cleanRoomId}`);
        this.localChannel.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.senderId === this.selfId) return;

          if (msg.type === 'peer_hello') {
            this.handlePeerJoin(msg.senderId);
            // Responde anunciando que também estamos na sala
            this.localChannel?.postMessage({
              type: 'peer_welcome',
              senderId: this.selfId
            });
          } else if (msg.type === 'peer_welcome') {
            this.handlePeerJoin(msg.senderId);
          } else if (msg.type === 'peer_bye') {
            this.handlePeerLeave(msg.senderId);
          } else if (msg.type === 'state') {
            this.stateListeners.forEach(listener => listener(msg.data, msg.senderId));
          } else if (msg.type === 'action') {
            this.actionListeners.forEach(listener => listener(msg.data, msg.senderId));
          }
        };

        // Envia sinal inicial de presença local e inicia pulsação periódica de sincronia
        this.localChannel.postMessage({ type: 'peer_hello', senderId: this.selfId });
        this.localHeartbeatTimer = window.setInterval(() => {
          if (this.localChannel) {
            this.localChannel.postMessage({ type: 'peer_hello', senderId: this.selfId });
          }
        }, 1200);
      } catch (e) {
        console.warn('BroadcastChannel não suportado neste ambiente', e);
      }
    }
  }

  private handlePeerJoin(peerId: string) {
    if (!this.connectedPeers.has(peerId)) {
      this.connectedPeers.add(peerId);
      console.log(`[P2P] Jogador conectado à sala: ${peerId}`);
      this.peerJoinListeners.forEach(listener => listener(peerId));
    }
  }

  private handlePeerLeave(peerId: string) {
    if (this.connectedPeers.has(peerId)) {
      this.connectedPeers.delete(peerId);
      console.log(`[P2P] Jogador desconectado da sala: ${peerId}`);
      this.peerLeaveListeners.forEach(listener => listener(peerId));
    }
  }

  public clearRoomUrl(): void {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('room')) {
          url.searchParams.delete('room');
          const cleanQuery = url.search ? url.search : '';
          window.history.replaceState({}, document.title, url.pathname + cleanQuery);
        }
      } catch (e) {}
    }
  }

  public leave(): void {
    this.clearRoomUrl();

    if (this.localHeartbeatTimer) {
      clearInterval(this.localHeartbeatTimer);
      this.localHeartbeatTimer = null;
    }

    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: 'peer_bye', senderId: this.selfId });
        this.localChannel.close();
      } catch (e) {}
      this.localChannel = null;
    }

    if (this.room) {
      try {
        this.room.leave();
      } catch (e) {
        console.warn('Erro ao sair da sala P2P', e);
      }
      this.room = null;
      this.stateAction = null;
      this.actionAction = null;
    }

    this.currentRoomId = null;
    this.isHost = false;
    this.connectedPeers.clear();
    this.roomChangeListeners.forEach(listener => listener(null));
  }

  public sendState(state: PlayerNetworkState): void {
    if (this.stateAction && this.connectedPeers.size > 0) {
      this.stateAction.send(state).catch(() => {});
    }
    if (this.localChannel && this.connectedPeers.size > 0) {
      this.localChannel.postMessage({
        type: 'state',
        senderId: this.selfId,
        data: state
      });
    }
  }

  public sendAction(action: PlayerNetworkAction): void {
    if (this.actionAction && this.connectedPeers.size > 0) {
      this.actionAction.send(action).catch(() => {});
    }
    if (this.localChannel && this.connectedPeers.size > 0) {
      this.localChannel.postMessage({
        type: 'action',
        senderId: this.selfId,
        data: action
      });
    }
  }

  public onRoomChange(listener: RoomChangeListener): () => void {
    this.roomChangeListeners.add(listener);
    return () => this.roomChangeListeners.delete(listener);
  }

  public onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  public onPeerJoin(listener: PeerListener): () => void {
    this.peerJoinListeners.add(listener);
    return () => this.peerJoinListeners.delete(listener);
  }

  public onPeerLeave(listener: PeerListener): () => void {
    this.peerLeaveListeners.add(listener);
    return () => this.peerLeaveListeners.delete(listener);
  }
}

export const NetworkManager = new NetworkManagerClass();

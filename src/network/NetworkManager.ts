import { joinRoom, selfId } from 'trystero/nostr';
import { PlayerNetworkState, PlayerNetworkAction, RoomInfo } from './NetworkTypes';

type StateListener = (state: PlayerNetworkState, peerId: string) => void;
type ActionListener = (action: PlayerNetworkAction, peerId: string) => void;
type PeerListener = (peerId: string) => void;
type RoomChangeListener = (roomId: string | null) => void;

class NetworkManagerClass {
  public selfId: string = selfId;
  public currentRoomId: string | null = null;
  public isHost: boolean = false;
  public connectedPeers: Set<string> = new Set();

  private room: any = null;
  private stateAction: any = null;
  private actionAction: any = null;

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
    if (this.room) {
      this.leave();
    }

    const cleanRoomId = roomId.trim().toUpperCase();
    this.currentRoomId = cleanRoomId;
    this.isHost = asHost;
    this.roomChangeListeners.forEach(listener => listener(cleanRoomId));

    try {
      // Configuração do Trystero via Nostr (Serverless WebRTC P2P)
      const config = { appId: 'masmorra-de-bolso-p2p' };
      this.room = joinRoom(config, cleanRoomId);

      // No Trystero v0.25+, makeAction retorna um objeto de ação { send, onMessage }
      this.stateAction = this.room.makeAction('pState');
      this.actionAction = this.room.makeAction('pAction');

      // Listeners de entrada e saída de jogadores no Trystero v0.25
      this.room.onPeerJoin = (peerId: string) => {
        console.log(`[P2P] Peer conectado: ${peerId}`);
        this.connectedPeers.add(peerId);
        this.peerJoinListeners.forEach(listener => listener(peerId));
      };

      this.room.onPeerLeave = (peerId: string) => {
        console.log(`[P2P] Peer desconectado: ${peerId}`);
        this.connectedPeers.delete(peerId);
        this.peerLeaveListeners.forEach(listener => listener(peerId));
      };

      this.stateAction.onMessage = (data: PlayerNetworkState, { peerId }: { peerId: string }) => {
        this.stateListeners.forEach(listener => listener(data, peerId));
      };

      this.actionAction.onMessage = (data: PlayerNetworkAction, { peerId }: { peerId: string }) => {
        this.actionListeners.forEach(listener => listener(data, peerId));
      };
    } catch (err) {
      console.error('[P2P] Erro ao inicializar sala:', err);
    }
  }

  public leave(): void {
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
  }

  public sendAction(action: PlayerNetworkAction): void {
    if (this.actionAction && this.connectedPeers.size > 0) {
      this.actionAction.send(action).catch(() => {});
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

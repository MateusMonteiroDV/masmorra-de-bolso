export interface PlayerNetworkState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'd' | 'e';
  anim: string;
  isAttacking: boolean;
  isShooting: boolean;
  isDefending: boolean;
  currentHp: number;
  maxHp: number;
  scene?: string;
}

export interface PlayerNetworkAction {
  type:
    | 'shoot_arrow'
    | 'melee_attack'
    | 'scene_sync'
    | 'enemy_hit'
    | 'enemy_damage'
    | 'chest_open'
    | 'dungeon_victory'
    | 'player_death'
    | 'all_players_dead'
    | 'lobby_ready_toggle'
    | 'lobby_start_countdown'
    | 'lobby_presence'
    | 'lobby_peer_waiting'
    | 'peer_ping'
    | 'peer_bye';
  payload?: any;
}

export interface RoomInfo {
  roomId: string;
  isHost: boolean;
  connectedPeers: string[];
}

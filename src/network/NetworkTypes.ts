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
}

export interface PlayerNetworkAction {
  type:
    | 'shoot_arrow'
    | 'melee_attack'
    | 'scene_sync'
    | 'enemy_hit'
    | 'enemy_damage'
    | 'chest_open'
    | 'dungeon_victory';
  payload?: any;
}

export interface RoomInfo {
  roomId: string;
  isHost: boolean;
  connectedPeers: string[];
}

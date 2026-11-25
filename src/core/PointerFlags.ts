/**
 * Botões de menu (Hub, Loja, Lobby, Multiplayer, controles touch) marcam o ponteiro com
 * `isVirtualControl` para que o clique não vire tiro/escudo no herói. Como o Phaser reaproveita
 * o mesmo objeto de ponteiro (o mouse é sempre o mesmo), a marca ficava presa para sempre e o
 * mouse parava de atirar e defender na masmorra.
 *
 * No início de cada novo clique/toque, limpa a marca dos ponteiros que não estão pressionados.
 * Ponteiros ainda segurados (ex.: dedo no joystick virtual) mantêm a marca.
 */
export interface VirtualFlagPointer {
  isDown: boolean;
  isVirtualControl?: boolean;
}

export function clearReleasedVirtualFlags(pointers: ReadonlyArray<VirtualFlagPointer | undefined>) {
  pointers.forEach(pointer => {
    if (pointer && !pointer.isDown) {
      pointer.isVirtualControl = false;
    }
  });
}

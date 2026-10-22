/**
 * RoomInputDialog
 * Modal HTML leve e elegante para entrada e colagem de ID de sala multiplayer.
 * Substitui o window.prompt() nativo, garantindo compatibilidade total com navegadores modernos,
 * modo anônimo, Brave Shields e bloqueadores de pop-up.
 */
export class RoomInputDialog {
  public static show(options: {
    title?: string;
    description?: string;
    defaultValue?: string;
    onConfirm: (roomId: string) => void;
    onCancel?: () => void;
  }) {
    document.getElementById('mdb-room-input-modal')?.remove();

    // Pausa captura de teclado no Phaser enquanto o modal estiver aberto
    // para evitar que teclas digitadas (W, A, S, D, E, Espaço) movimentem o herói
    const phaserGame = (typeof window !== 'undefined' ? (window as any).game : undefined);
    const prevKeyboardEnabled = phaserGame?.input?.keyboard?.enabled ?? true;
    if (phaserGame?.input?.keyboard) {
      phaserGame.input.keyboard.enabled = false;
    }

    const overlay = document.createElement('div');
    overlay.id = 'mdb-room-input-modal';
    overlay.style.cssText =
      "position:fixed;inset:0;padding:6px;box-sizing:border-box;background:rgba(2,6,23,0.88);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:'Courier New',Courier,monospace;";

    overlay.innerHTML = `
      <div style="width:92%;max-width:340px;max-height:94dvh;overflow-y:auto;box-sizing:border-box;background:#0a0f1d;border:2px solid #0284c7;border-radius:8px;padding:10px 14px;box-shadow:0 0 25px rgba(2,132,199,0.45);color:#f8fafc;text-align:center;">
        <h3 style="margin:0 0 4px;font-size:13px;color:#38bdf8;letter-spacing:1px;font-weight:bold;">${options.title || '🔑 CONECTAR COM ID DA SALA'}</h3>
        <p style="margin:0 0 8px;font-size:10px;color:#94a3b8;line-height:1.3;">${options.description || 'Digite ou cole o código ID gerado pelo anfitrião:'}</p>
        <input type="text" maxlength="14" placeholder="Ex: MDB-1234" value="${options.defaultValue || ''}" autocapitalize="characters" autocorrect="off" autocomplete="off" spellcheck="false" inputmode="text" style="width:85%;padding:8px 10px;font-size:16px;text-align:center;font-weight:bold;letter-spacing:2px;background:#0f172a;border:1.5px solid #38bdf8;border-radius:6px;color:#facc15;outline:none;margin-bottom:8px;text-transform:uppercase;" />
        <div id="mdb-room-err" style="font-size:10px;color:#f43f5e;margin-bottom:8px;display:none;"></div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="mdb-room-cancel" style="padding:6px 14px;font-size:11px;font-weight:bold;background:#334155;color:#f1f5f9;border:none;border-radius:4px;cursor:pointer;">CANCELAR</button>
          <button id="mdb-room-ok" style="padding:6px 14px;font-size:11px;font-weight:bold;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;">✅ ENTRAR NA SALA</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('input')!;
    const errorMsg = overlay.querySelector<HTMLDivElement>('#mdb-room-err')!;
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('#mdb-room-cancel')!;
    const confirmBtn = overlay.querySelector<HTMLButtonElement>('#mdb-room-ok')!;

    // Não mutamos input.value no evento 'input' porque isso cancela a composição de texto (IME)
    // nos teclados mobile (Gboard/iOS), forçando o usuário a apertar Shift ou CapsLock.
    // O estilo CSS 'text-transform: uppercase' já exibe visualmente maiúsculo enquanto digita.
    input.addEventListener('blur', () => {
      input.value = input.value.trim().toUpperCase();
    });

    // Interrompe borbulhamento de teclas na fase de captura para que o jogo nunca receba WASD
    const stopKeyPropagation = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
        return;
      }
      e.stopPropagation();
    };
    overlay.addEventListener('keydown', stopKeyPropagation, true);
    overlay.addEventListener('keyup', stopKeyPropagation, true);
    overlay.addEventListener('keypress', stopKeyPropagation, true);
    input.addEventListener('keydown', stopKeyPropagation, true);

    const cleanup = () => {
      input.blur();
      overlay.remove();
      document.removeEventListener('keydown', handleKey);

      // Restaura o teclado do Phaser ao fechar o diálogo
      if (phaserGame?.input?.keyboard) {
        phaserGame.input.keyboard.enabled = prevKeyboardEnabled;
      }

      try {
        window.scrollTo(0, 0);
      } catch (e) {}
    };

    const handleConfirm = () => {
      const rawCode = input.value.trim().toUpperCase();
      if (!rawCode) {
        errorMsg.innerText = '⚠️ Digite um código de sala válido!';
        errorMsg.style.display = 'block';
        input.focus();
        return;
      }

      // Normaliza o código: aceita "1234", "mdb1234", "mdb 1234", "mdb-1234", "MDB-1234"
      let cleanCode = rawCode.replace(/\s+/g, '-').replace(/--+/g, '-');
      if (/^\d{4}$/.test(cleanCode)) {
        cleanCode = `MDB-${cleanCode}`;
      } else if (/^MDB\d{4}$/.test(cleanCode)) {
        cleanCode = `MDB-${cleanCode.slice(3)}`;
      }

      cleanup();
      options.onConfirm(cleanCode);
    };

    const handleCancel = () => {
      cleanup();
      options.onCancel?.();
    };

    const handleKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    confirmBtn.addEventListener('pointerdown', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    cancelBtn.addEventListener('pointerdown', handleCancel);
    document.addEventListener('keydown', handleKey);

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }
}



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

    const overlay = document.createElement('div');
    overlay.id = 'mdb-room-input-modal';
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(2,6,23,0.82);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:'Courier New',Courier,monospace;";

    overlay.innerHTML = `
      <div style="width:90%;max-width:360px;background:#0a0f1d;border:2px solid #0284c7;border-radius:8px;padding:20px;box-shadow:0 0 25px rgba(2,132,199,0.45);color:#f8fafc;text-align:center;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#38bdf8;letter-spacing:1px;font-weight:bold;">${options.title || '🔑 CONECTAR COM ID DA SALA'}</h3>
        <p style="margin:0 0 16px;font-size:11px;color:#94a3b8;line-height:1.4;">${options.description || 'Digite ou cole o código ID gerado pelo anfitrião:'}</p>
        <input type="text" maxlength="14" placeholder="Ex: MDB-1234" value="${options.defaultValue || ''}" style="width:85%;padding:10px 12px;font-size:16px;text-align:center;font-weight:bold;letter-spacing:2px;background:#0f172a;border:1.5px solid #38bdf8;border-radius:6px;color:#facc15;outline:none;margin-bottom:12px;text-transform:uppercase;" />
        <div id="mdb-room-err" style="font-size:10px;color:#f43f5e;margin-bottom:12px;display:none;"></div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="mdb-room-cancel" style="padding:8px 16px;font-size:11px;font-weight:bold;background:#334155;color:#f1f5f9;border:none;border-radius:4px;cursor:pointer;">CANCELAR</button>
          <button id="mdb-room-ok" style="padding:8px 16px;font-size:11px;font-weight:bold;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;">✅ ENTRAR NA SALA</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('input')!;
    const errorMsg = overlay.querySelector<HTMLDivElement>('#mdb-room-err')!;
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('#mdb-room-cancel')!;
    const confirmBtn = overlay.querySelector<HTMLButtonElement>('#mdb-room-ok')!;

    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
    });

    const cleanup = () => {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
    };

    const handleConfirm = () => {
      const code = input.value.trim().toUpperCase();
      if (!code) {
        errorMsg.innerText = '⚠️ Digite um código de sala válido!';
        errorMsg.style.display = 'block';
        input.focus();
        return;
      }
      cleanup();
      options.onConfirm(code);
    };

    const handleCancel = () => {
      cleanup();
      options.onCancel?.();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKey);

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }
}


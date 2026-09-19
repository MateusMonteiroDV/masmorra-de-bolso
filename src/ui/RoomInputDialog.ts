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
    // Remove qualquer modal pré-existente
    const existing = document.getElementById('mdb-room-input-modal');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'mdb-room-input-modal';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(2, 6, 23, 0.82)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = "'Courier New', Courier, monospace";

    const modalBox = document.createElement('div');
    modalBox.style.width = '90%';
    modalBox.style.maxWidth = '360px';
    modalBox.style.backgroundColor = '#0a0f1d';
    modalBox.style.border = '2px solid #0284c7';
    modalBox.style.borderRadius = '8px';
    modalBox.style.padding = '20px';
    modalBox.style.boxShadow = '0 0 25px rgba(2, 132, 199, 0.45)';
    modalBox.style.color = '#f8fafc';
    modalBox.style.textAlign = 'center';

    const titleEl = document.createElement('h3');
    titleEl.innerText = options.title || '🔑 CONECTAR COM ID DA SALA';
    titleEl.style.margin = '0 0 8px 0';
    titleEl.style.fontSize = '14px';
    titleEl.style.color = '#38bdf8';
    titleEl.style.letterSpacing = '1px';
    titleEl.style.fontWeight = 'bold';
    modalBox.appendChild(titleEl);

    const descEl = document.createElement('p');
    descEl.innerText = options.description || 'Digite ou cole o código ID gerado pelo anfitrião:';
    descEl.style.margin = '0 0 16px 0';
    descEl.style.fontSize = '11px';
    descEl.style.color = '#94a3b8';
    descEl.style.lineHeight = '1.4';
    modalBox.appendChild(descEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 14;
    input.placeholder = 'Ex: MDB-1234';
    input.value = options.defaultValue || '';
    input.style.width = '85%';
    input.style.padding = '10px 12px';
    input.style.fontSize = '16px';
    input.style.textAlign = 'center';
    input.style.fontWeight = 'bold';
    input.style.letterSpacing = '2px';
    input.style.backgroundColor = '#0f172a';
    input.style.border = '1.5px solid #38bdf8';
    input.style.borderRadius = '6px';
    input.style.color = '#facc15';
    input.style.outline = 'none';
    input.style.marginBottom = '12px';
    input.style.textTransform = 'uppercase';

    // Auto-uppercase ao digitar ou colar
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
    });

    modalBox.appendChild(input);

    const errorMsg = document.createElement('div');
    errorMsg.style.fontSize = '10px';
    errorMsg.style.color = '#f43f5e';
    errorMsg.style.marginBottom = '12px';
    errorMsg.style.display = 'none';
    modalBox.appendChild(errorMsg);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'center';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'CANCELAR';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.fontSize = '11px';
    cancelBtn.style.fontWeight = 'bold';
    cancelBtn.style.backgroundColor = '#334155';
    cancelBtn.style.color = '#f1f5f9';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';

    const confirmBtn = document.createElement('button');
    confirmBtn.innerText = '✅ ENTRAR NA SALA';
    confirmBtn.style.padding = '8px 16px';
    confirmBtn.style.fontSize = '11px';
    confirmBtn.style.fontWeight = 'bold';
    confirmBtn.style.backgroundColor = '#16a34a';
    confirmBtn.style.color = '#ffffff';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.cursor = 'pointer';

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    modalBox.appendChild(buttonContainer);

    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);

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
      if (options.onCancel) {
        options.onCancel();
      }
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

    // Foco imediato no campo de texto
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }
}

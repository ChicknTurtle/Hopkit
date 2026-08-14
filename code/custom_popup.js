export const CustomPopup = {
  showing: false,

  init() {
    this.popup = document.getElementById('customPopup');
    this.title = document.getElementById('customPopupTitle');
    this.textInput = document.getElementById('customPopupText');
    this.buttonsContainer = document.getElementById('customPopupButtons');
  },

  show({ title, text, buttons }) {
    this.title.textContent = title || "";

    if (text !== undefined && text !== null) {
      this.textInput.value = text;
      this.textInput.classList.remove('hidden');
    } else {
      this.textInput.value = "";
      this.textInput.classList.add('hidden');
    }

    this.buttonsContainer.innerHTML = "";
    (buttons || []).forEach(({ label, onClick, closeOnClick = true }) => {
      const btn = document.createElement('button');
      btn.className = 'popup-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (onClick) onClick(btn);
        if (closeOnClick) this.hide();
      });
      this.buttonsContainer.appendChild(btn);
    });

    this.popup.classList.remove('hidden');
    this.showing = true;
  },

  hide() {
    this.popup.classList.add('hidden');
    this.showing = false;
  }
};
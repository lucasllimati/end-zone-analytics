// Aplica o tema salvo antes da primeira pintura (evita "flash" de tema errado). Escuro é o padrão.
(function () {
  try {
    var t = localStorage.getItem('eza-theme');
    document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();

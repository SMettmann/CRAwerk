(() => {
  const form = document.getElementById('cra-check');
  if (!form) return;

  const questions = [...form.querySelectorAll('.check-question')];
  const nextBtn = document.getElementById('check-next');
  const backBtn = document.getElementById('check-back');
  const restartBtn = document.getElementById('restart-check');
  const result = document.getElementById('check-result');
  const resultTitle = document.getElementById('result-title');
  const resultText = document.getElementById('result-text');
  const resultPoints = document.getElementById('result-points');
  const progressBar = document.getElementById('check-progress-bar');
  let index = 0;

  const currentAnswer = () => {
    const q = questions[index];
    return q ? q.querySelector('input[type="radio"]:checked') : null;
  };

  const updateUi = () => {
    questions.forEach((q, i) => q.classList.toggle('active', i === index));
    result.hidden = true;
    document.querySelector('.check-controls').hidden = false;
    backBtn.disabled = index === 0;
    nextBtn.disabled = !currentAnswer();
    nextBtn.textContent = index === questions.length - 1 ? 'Auswertung anzeigen' : 'Weiter';
    progressBar.style.width = (((index + 1) / questions.length) * 100) + '%';
  };

  form.addEventListener('change', () => {
    nextBtn.disabled = !currentAnswer();
  });

  nextBtn.addEventListener('click', () => {
    if (!currentAnswer()) return;

    if (index < questions.length - 1) {
      index += 1;
      updateUi();
      questions[index].scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }

    showResult();
  });

  backBtn.addEventListener('click', () => {
    if (index === 0) return;
    index -= 1;
    updateUi();
  });

  restartBtn.addEventListener('click', () => {
    form.reset();
    index = 0;
    result.hidden = true;
    document.querySelector('.check-controls').hidden = false;
    updateUi();
    form.scrollIntoView({behavior:'smooth', block:'start'});
  });

  function value(name) {
    const input = form.querySelector('input[name="' + name + '"]:checked');
    return input ? input.value : 'unknown';
  }

  function showResult() {
    const digital = value('q1') === 'yes';
    const connected = value('q2') === 'yes';
    const interfacePresent = value('q3') === 'yes';
    const ownBrand = value('q4') === 'yes';
    const suppliers = value('q5') === 'yes';
    const inventoryMissing = value('q6') !== 'yes';
    const vulnProcessMissing = value('q7') !== 'yes';

    let signals = 0;
    if (digital) signals += 1;
    if (connected) signals += 2;
    if (interfacePresent) signals += 1;
    if (ownBrand) signals += 2;

    let title = '';
    let text = '';

    if (signals >= 4) {
      title = 'Der CRA ist für Ihr Produkt sehr wahrscheinlich ein Thema.';
      text = 'Ihr Produkt enthält mehrere Merkmale, bei denen Sie sich mit dem CRA beschäftigen sollten. Sie müssen jetzt nicht alles selbst überblicken: Entscheidend ist zuerst, sauber festzuhalten, was in Ihrer Maschine steckt, wie sie verbunden ist und welche Unterlagen bereits vorhanden sind.';
    } else if (signals >= 2) {
      title = 'Der CRA könnte für Ihr Produkt wichtig sein.';
      text = 'Einige Ihrer Antworten sprechen dafür, dass Sie das Thema genauer prüfen sollten. Als Nächstes sollten Sie klären, welche digitalen Funktionen Ihre Maschine hat und welche Unterlagen dazu schon vorhanden sind.';
    } else {
      title = 'Nach Ihren Antworten ist der CRA nicht sofort eindeutig.';
      text = 'Bei Ihrem Produkt sind nur wenige typische Merkmale erkennbar. Das bedeutet nicht automatisch, dass der CRA keine Rolle spielt. Prüfen Sie im nächsten Schritt, ob Software, Netzwerkfunktionen oder digitale Komponenten Teil Ihres Produkts sind.';
    }

    const points = [];
    if (suppliers) points.push('Unterlagen Ihrer Steuerungs- und Softwarelieferanten zusammensuchen');
    if (inventoryMissing) points.push('Festhalten, welche Software und Firmware in Ihrer Maschine steckt');
    if (vulnProcessMissing) points.push('Festlegen, wer sich um Sicherheitslücken und Updates kümmert');
    if (connected || interfacePresent) points.push('Prüfen, wie Ihre Maschine von außen erreichbar oder verbunden ist');
    if (ownBrand) points.push('Festhalten, welche CRA-Aufgaben für Ihre eigene Maschine noch offen sind');

    if (!points.length) {
      points.push('Prüfen, welche digitalen Funktionen Ihre Maschine überhaupt hat');
      points.push('Vorhandene Unterlagen zu Software, Steuerung und Updates zusammensuchen');
    }

    resultTitle.textContent = title;
    resultText.textContent = text;
    resultPoints.innerHTML =
      '<span class="result-label">Das sollten Sie als Nächstes tun</span>' +
      '<ul>' + points.map(p => '<li>' + p + '</li>').join('') + '</ul>';

    questions.forEach(q => q.classList.remove('active'));
    document.querySelector('.check-controls').hidden = true;
    result.hidden = false;
    progressBar.style.width = '100%';
    result.scrollIntoView({behavior:'smooth', block:'center'});
  }

  updateUi();
})();
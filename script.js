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
      title = 'Mehrere Merkmale sprechen für einen näheren CRA-Check.';
      text = 'Ihr Produkt weist mehrere Merkmale auf, die bei der CRA-Einordnung relevant sein können. Besonders wichtig ist jetzt, den konkreten Anwendungsbereich für das Produkt zu prüfen und die vorhandene Dokumentation strukturiert zusammenzuführen.';
    } else if (signals >= 2) {
      title = 'Der CRA könnte für Ihr Produkt relevant sein.';
      text = 'Es gibt Anhaltspunkte, die eine genauere Prüfung sinnvoll machen. Entscheidend sind das konkrete Produkt, seine digitalen Funktionen, seine Verbindungen und die Rolle Ihres Unternehmens beim Inverkehrbringen.';
    } else {
      title = 'Aus Ihren Antworten ergibt sich noch kein klares Bild.';
      text = 'Der Kurzcheck zeigt nur wenige typische CRA-Merkmale. Das schließt eine Relevanz aber nicht verbindlich aus. Für die Einordnung kommt es auf das konkrete Produkt und seine vorgesehenen Funktionen an.';
    }

    const points = [];
    if (suppliers) points.push('Zulieferer-Unterlagen und eigene Integrationsbewertung zusammenführen');
    if (inventoryMissing) points.push('Software- und Firmware-Bestandteile sauber dokumentieren');
    if (vulnProcessMissing) points.push('Ablauf für Sicherheitslücken und Sicherheitsupdates festlegen');
    if (connected || interfacePresent) points.push('Netzwerk-, Fernwartungs- und Schnittstellenrisiken bewerten');
    if (ownBrand) points.push('Herstellerpflichten für das eigene Gesamtprodukt strukturiert prüfen');

    if (!points.length) {
      points.push('Konkretes Produkt anhand des CRA-Anwendungsbereichs einordnen');
      points.push('Vorhandene technische Unterlagen und Sicherheitsprozesse erfassen');
    }

    resultTitle.textContent = title;
    resultText.textContent = text;
    resultPoints.innerHTML =
      '<span class="result-label">Sinnvolle nächste Prüfpunkte</span>' +
      '<ul>' + points.map(p => '<li>' + p + '</li>').join('') + '</ul>';

    questions.forEach(q => q.classList.remove('active'));
    document.querySelector('.check-controls').hidden = true;
    result.hidden = false;
    progressBar.style.width = '100%';
    result.scrollIntoView({behavior:'smooth', block:'center'});
  }

  updateUi();
})();
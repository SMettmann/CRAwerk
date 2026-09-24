(() => {
  const form = document.getElementById('cra-check');
  if (!form) return;

  const questions = [...form.querySelectorAll('.check-question')];
  const controls = form.querySelector('.check-controls');
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
    controls.hidden = false;
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
    controls.hidden = false;
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
      title = 'Den CRA sollten Sie für dieses Produkt jetzt einplanen.';
      text = 'Mehrere Ihrer Antworten sprechen dafür, dass der CRA für Ihre Maschine relevant sein kann. Sie müssen daraus aber kein eigenes Verwaltungsprojekt machen: CRAwerk soll die vorhandenen Unterlagen, Komponenten und offenen Punkte an einem Ort zusammenführen.';
    } else if (signals >= 2) {
      title = 'Den CRA sollten Sie für dieses Produkt genauer prüfen.';
      text = 'Einige Ihrer Antworten sprechen dafür, dass der CRA für Ihre Maschine wichtig werden kann. Der nächste Schritt ist nicht, selbst neue Listen anzulegen: CRAwerk soll Sie mit den vorhandenen Unterlagen starten lassen und nur die fehlenden Angaben abfragen.';
    } else {
      title = 'Die CRA-Relevanz ist nach Ihren Antworten noch offen.';
      text = 'Bei Ihrem Produkt sind nur wenige typische Merkmale erkennbar. CRAwerk soll Ihnen trotzdem helfen, die entscheidenden Punkte sauber zu prüfen, ohne dass Sie sich zuerst durch den Gesetzestext arbeiten müssen.';
    }

    const focus = [];
    if (suppliers) focus.push('Lieferantenunterlagen direkt der richtigen Maschine und Komponente zuordnen');
    if (inventoryMissing) focus.push('Fehlende Angaben zu Software und Firmware gezielt ergänzen');
    if (vulnProcessMissing) focus.push('Verantwortung für Sicherheitslücken und Updates eindeutig festlegen');
    if (connected || interfacePresent) focus.push('Verbindungen, Fernwartung und erreichbare Schnittstellen sauber erfassen');
    if (ownBrand) focus.push('Offene CRA-Punkte für Ihr eigenes Gesamtprodukt sichtbar machen');

    if (!focus.length) {
      focus.push('Digitale Funktionen Ihrer Maschine strukturiert erfassen');
      focus.push('Vorhandene technische Unterlagen an einem Ort zusammenführen');
    }

    resultTitle.textContent = title;
    resultText.textContent = text;

    resultPoints.innerHTML =
      '<div class="result-flow">' +
        '<span class="result-label">So geht es mit CRAwerk weiter</span>' +
        '<div class="result-flow-grid">' +
          '<div class="result-flow-step"><b>1</b><strong>Vorhandenes hochladen</strong><span>Lieferanten-PDFs, Softwarelisten, technische Unterlagen und vorhandene Nachweise.</span></div>' +
          '<div class="result-flow-step"><b>2</b><strong>CRAwerk ordnet</strong><span>Alles wird Ihrer Maschine, den Komponenten und den passenden Themen zugeordnet.</span></div>' +
          '<div class="result-flow-step"><b>3</b><strong>Nur Lücken ergänzen</strong><span>Sie beantworten nur noch die Punkte, die bei Ihrem Produkt wirklich fehlen.</span></div>' +
          '<div class="result-flow-step"><b>4</b><strong>Produktakte im Blick</strong><span>Offene Aufgaben, Nachweise, Updates und Fristen bleiben übersichtlich zusammen.</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="result-focus">' +
        '<span class="result-label">Bei Ihren Antworten besonders wichtig</span>' +
        '<ul>' + focus.map(p => '<li>' + p + '</li>').join('') + '</ul>' +
      '</div>' +
      '<a class="button button-dark result-cta" href="#preis">CRAwerk für 29,99 € ansehen</a>';

    questions.forEach(q => q.classList.remove('active'));
    controls.hidden = true;
    result.hidden = false;
    progressBar.style.width = '100%';
    result.scrollIntoView({behavior:'smooth', block:'center'});
  }

  updateUi();
})();
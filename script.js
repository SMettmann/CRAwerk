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
      title = 'Der CRA ist für Ihre Maschine sehr wahrscheinlich ein Thema.';
      text = 'Mehrere Ihrer Antworten sprechen dafür. CRAwerk hilft Ihnen dabei, vorhandene Unterlagen zu ordnen, fehlende Angaben zu erkennen und den Stand Ihrer Maschine übersichtlich festzuhalten.';
    } else if (signals >= 2) {
      title = 'Der CRA könnte für Ihre Maschine wichtig sein.';
      text = 'Einige Ihrer Antworten sprechen dafür. Mit CRAwerk starten Sie mit dem, was schon vorhanden ist, und ergänzen nur die Punkte, die noch fehlen.';
    } else {
      title = 'Nach Ihren Antworten ist noch nicht klar, ob der CRA greift.';
      text = 'Bei Ihrer Maschine sind nur wenige typische Merkmale erkennbar. CRAwerk hilft Ihnen, die entscheidenden Punkte zu prüfen, ohne sich zuerst durch den Gesetzestext arbeiten zu müssen.';
    }

    const focus = [];
    if (suppliers) focus.push('Unterlagen Ihrer Zulieferer der richtigen Maschine zuordnen');
    if (inventoryMissing) focus.push('Fehlende Angaben zu Software und Versionen ergänzen');
    if (vulnProcessMissing) focus.push('Festlegen, wer sich um Sicherheitslücken und Updates kümmert');
    if (connected || interfacePresent) focus.push('Netzwerk, Fernwartung und andere Verbindungen erfassen');
    if (ownBrand) focus.push('Offene CRA-Aufgaben für Ihre eigene Maschine sichtbar machen');

    if (!focus.length) {
      focus.push('Digitale Funktionen Ihrer Maschine erfassen');
      focus.push('Vorhandene Unterlagen an einem Ort zusammenführen');
    }

    resultTitle.textContent = title;
    resultText.textContent = text;

    resultPoints.innerHTML =
      '<div class="result-flow">' +
        '<span class="result-label">So geht es mit CRAwerk weiter</span>' +
        '<div class="result-flow-grid">' +
          '<div class="result-flow-step"><b>1</b><strong>Vorhandenes hinzufügen</strong><span>Zulieferer-PDFs, Softwarelisten und technische Unterlagen.</span></div>' +
          '<div class="result-flow-step"><b>2</b><strong>CRAwerk ordnet</strong><span>Alles wird der passenden Maschine und dem richtigen Bauteil zugeordnet.</span></div>' +
          '<div class="result-flow-step"><b>3</b><strong>Nur Fehlendes ergänzen</strong><span>Sie beantworten nur noch die Punkte, die bei Ihrer Maschine offen sind.</span></div>' +
          '<div class="result-flow-step"><b>4</b><strong>Alles im Blick</strong><span>Aufgaben, Unterlagen, Updates und Fristen bleiben übersichtlich zusammen.</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="result-focus">' +
        '<span class="result-label">Bei Ihrer Maschine besonders wichtig</span>' +
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
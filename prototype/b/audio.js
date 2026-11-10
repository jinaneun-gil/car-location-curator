// Speech output with sentence-level resume after a navigation prompt, plus voice commands.
(function () {
  let sentences = [], index = 0, currentId = null, token = 0;

  // A guard timer ends the sentence if the browser never reports completion.
  function say(text, done) {
    const mine = ++token;
    let finished = false;
    const finish = () => {
      if (finished || mine !== token) return;
      finished = true;
      clearTimeout(guard);
      done();
    };
    const guard = setTimeout(finish, (text.length / 5 + 2) * 1000);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
  }

  function next() {
    if (currentId === null) return;
    if (index >= sentences.length) {
      const id = currentId;
      currentId = null;
      App.onFinished(id);
      return;
    }
    say(sentences[index], () => { index++; next(); });
  }

  function stop() {
    token++;
    speechSynthesis.cancel();
    if (currentId !== null) {
      const id = currentId;
      currentId = null;
      App.onFinished(id);
    }
  }

  App.play = ({ contentId, version }) => {
    sentences = App.contentById(contentId)[version].match(/[^.!?]+[.!?]?/g).map(t => t.trim()).filter(Boolean);
    index = 0;
    currentId = contentId;
    App.showNowPlaying(contentId);
    next();
  };

  App.interruptForNavi = text => {
    token++;
    speechSynthesis.cancel();
    App.log(`내비 안내: ${text}`);
    say(text, next);
  };

  // Shared by the on-screen buttons and speech recognition.
  App.sendCommand = command => {
    if (command === 'next' || command === 'stop') stop();
    App.onCommand(command);
  };

  App.listen = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { App.log('이 브라우저는 음성 인식을 지원하지 않습니다.'); return; }
    const recognition = new Recognition();
    recognition.lang = 'ko-KR';
    recognition.onresult = e => {
      const heard = e.results[0][0].transcript.replace(/\s/g, '');
      App.log(`인식: ${heard}`);
      if (/가볼래|가자|들를래/.test(heard)) App.sendCommand('go');
      else if (/다음/.test(heard)) App.sendCommand('next');
      else if (/그만/.test(heard)) App.sendCommand('stop');
    };
    recognition.onerror = e => App.log(`음성 인식 오류: ${e.error}`);
    recognition.start();
  };
})();

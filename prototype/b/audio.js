// Speech output with sentence-level resume after a navigation prompt, plus voice commands.
// The navigation voice always comes first: a story pauses at the current sentence and repeats it afterwards.
(function () {
  let sentences = [], index = 0, currentId = null, token = 0, naviActive = false;
  const synth = window.speechSynthesis;
  let koreanVoice = null;

  // Prefer an explicit Korean voice; the default voice may not read Korean.
  // Installed (local) voices first: Chrome's online Google voice goes silent after a few minutes.
  function pickVoice() {
    const voices = synth.getVoices().filter(v => /^ko/i.test(v.lang));
    koreanVoice = voices.find(v => v.localService) || voices[0] || null;
  }
  if (synth) {
    pickVoice();
    synth.addEventListener('voiceschanged', pickVoice);
  }

  // kind: 'story' | 'ad' | 'navi'. The navigation prompt uses a lower, slightly faster voice so the two are easy to tell apart.
  // A guard timer ends the sentence if the browser never reports completion.
  function say(text, kind, done) {
    const mine = ++token;
    let finished = false;
    const finish = () => {
      if (finished || mine !== token) return;
      finished = true;
      clearTimeout(guard);
      done();
    };
    // If the browser hangs on an utterance, every later utterance queues behind it and the rest is silent.
    // So on timeout, clear the stuck queue before moving on.
    const guard = setTimeout(() => {
      if (mine === token && synth) { synth.cancel(); synth.resume(); }
      finish();
    }, (text.length / 4 + 3) * 1000);
    App.showCaption(text, kind);
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    if (koreanVoice) utterance.voice = koreanVoice;
    utterance.rate = kind === 'navi' ? 1.05 : 1;
    utterance.pitch = kind === 'navi' ? 0.8 : 1;
    utterance.onend = finish;
    utterance.onerror = finish;
    synth.speak(utterance);
  }

  const kindOf = id => (App.contentById(id).type === 'ad' ? 'ad' : 'story');

  function finishCurrent() {
    const id = currentId;
    currentId = null;
    App.showNowPlaying(null);
    App.showCaption(null);
    App.onFinished(id);
  }

  function next() {
    if (currentId === null) { App.showCaption(null); return; }
    if (index >= sentences.length) { finishCurrent(); return; }
    App.showProgress(index, sentences.length);
    say(sentences[index], kindOf(currentId), () => { index++; next(); });
  }

  function stop() {
    token++;
    if (synth) synth.cancel();
    if (naviActive) { naviActive = false; App.showNavi(null); }
    if (currentId !== null) finishCurrent();
    else App.showCaption(null);
  }

  // Split after . ! ? but keep decimals such as 1.2 in one sentence.
  App.splitSentences = text => text.match(/(?:[^.!?]|\.(?=\d))+[.!?]?/g).map(t => t.trim()).filter(Boolean);

  App.play = ({ contentId, version }) => {
    sentences = App.splitSentences(App.contentById(contentId)[version]);
    index = 0;
    currentId = contentId;
    App.showNowPlaying(contentId, version);
    if (!naviActive) next();
  };

  App.interruptForNavi = text => {
    token++;
    if (synth) synth.cancel();
    naviActive = true;
    App.showNavi(text);
    App.log(`내비 안내: ${text}`);
    say(text, 'navi', () => {
      naviActive = false;
      App.showNavi(null);
      next();
    });
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
    App.showListening(true);
    recognition.onresult = e => {
      const heard = e.results[0][0].transcript.replace(/\s/g, '');
      App.log(`인식: ${heard}`);
      if (/가볼래|가자|들를래|들러/.test(heard)) App.sendCommand('go');
      else if (/다음|넘겨/.test(heard)) App.sendCommand('next');
      else if (/그만|멈춰|조용/.test(heard)) App.sendCommand('stop');
      else App.log('알아듣지 못했습니다. "가 볼래", "다음", "그만" 중 하나로 말해 주세요.');
    };
    recognition.onerror = e => App.log(`음성 인식 오류: ${e.error}`);
    recognition.onend = () => App.showListening(false);
    recognition.start();
  };
})();

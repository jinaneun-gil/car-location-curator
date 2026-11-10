// Shared contract between A (decisions) and B (sound, screen, content). See CLAUDE.md.
window.App = {
  NAME: '지나는 길에',
  contents: [],
  contentById(id) { return this.contents.find(c => c.id === id); },
  log(text) { console.log(text); },

  // Implemented by B.
  play(cue) {},
  interruptForNavi(text) {},
  setMode(mode) {},
  showVehicle(state) {},
  showWaypoint(name) {},

  // Implemented by A.
  onFinished(contentId) {},
  onCommand(command) {},
  setPreferences({ consent, interests }) {},
  onCouponSaved(contentId) {},
  addAd(ad) {},

  // Implemented by the phone screen.
  saveCoupon(content) {},
  phoneUpdate() {},
};

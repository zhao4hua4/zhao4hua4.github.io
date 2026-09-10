'use strict';

// Reading, navigation and disclosures use native HTML. Only clipboard actions need JS.
document.querySelectorAll('[data-enhance]').forEach(element => { element.hidden = false; });

document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copy);
    const feedback = document.getElementById(button.dataset.feedback);
    if (!target || !feedback) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(target.textContent);
      feedback.textContent = 'Citation copied.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      feedback.textContent = 'Selected. Press ⌘C or Ctrl+C to copy.';
    }
  });
});

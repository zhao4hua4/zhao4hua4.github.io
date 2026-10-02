/* Interactions use published aggregate results only. No model calls or user inputs are sent. */
(() => {
  'use strict';
  if (!document.body.classList.contains('poster-page')) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  $$('[data-enhancement]').forEach(node => { node.hidden = false; });
  $$('[data-switcher]').forEach(root => {
    const controls = $('[data-switch-controls]', root);
    const buttons = $$('[data-panel]', controls);
    const panels = $$('[data-switch-panel]', root);
    const select = button => {
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      panels.forEach(panel => { panel.hidden = panel.id !== button.dataset.panel; });
    };
    buttons.forEach(button => button.addEventListener('click', () => select(button)));
    select(buttons[0]);
    controls.hidden = false;
  });

  const metric = $('#performance-metric');
  const comparison = $('#compare-model');
  const bars = $$('#performance-bars [data-model]');
  const metrics = {
    f1: ['Macro-F1', 'Equal-weight average of the three class F1 scores. Higher is better.'],
    up: ['UPWARD recall', 'Of reader-labelled UPWARD posts, the percentage recovered as UPWARD.'],
    neutral: ['NEUTRAL recall', 'Of reader-labelled NEUTRAL posts, the percentage recovered as NEUTRAL.'],
    down: ['DOWNWARD recall', 'Of reader-labelled DOWNWARD posts, the percentage recovered as DOWNWARD.']
  };
  const updatePerformance = (announce = true) => {
    const key = metric.value;
    const label = metrics[key][0];
    const baseline = bars.find(row => row.dataset.model === 'roberta_pred');
    const other = bars.find(row => row.dataset.model === comparison.value);
    const score = Number(baseline.dataset[key]);
    const delta = score - Number(other.dataset[key]);
    bars.forEach(row => {
      const value = Number(row.dataset[key]);
      $('[data-score]', row).textContent = value.toFixed(1);
      $('.poster-bar', row).style.setProperty('--score', value + '%');
      row.classList.toggle('poster-comparison', row === other);
    });
    $('#performance-score').textContent = score.toFixed(1);
    $('#performance-unit').textContent = label + (key === 'f1' ? ' / 100' : ' (%)');
    $('#performance-delta').textContent = (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1);
    const versus = (key === 'f1' ? 'Macro-F1 points' : 'percentage points in recall') + ' vs zero-shot ' + comparison.selectedOptions[0].textContent;
    $('#performance-delta-unit').textContent = versus;
    $('#performance-chart-title').textContent = label;
    $('#performance-explanation').textContent = metrics[key][1];
    $('#performance-announcement').textContent = announce ? label + ': RoBERTa ' + score.toFixed(1) + ', ' + comparison.selectedOptions[0].textContent + ' ' + Number(other.dataset[key]).toFixed(1) + '.' : '';
  };
  metric.addEventListener('change', () => updatePerformance());
  comparison.addEventListener('change', () => updatePerformance());
  updatePerformance(false);

  const flowModel = $('#flow-model');
  const flowLabel = $('#flow-label');
  const labels = ['UPWARD', 'NEUTRAL', 'DOWNWARD'];
  const updateFlow = (announce = true) => {
    const option = flowModel.selectedOptions[0];
    const index = Number(flowLabel.value);
    const counts = JSON.parse(option.dataset.matrix)[index];
    const total = counts.reduce((sum, value) => sum + value, 0);
    const percentages = counts.map(value => (value / total * 100).toFixed(1) + '%');
    $('#flow-setting').textContent = option.textContent + ' · ' + option.dataset.setting;
    $('#flow-total').textContent = total.toLocaleString('en-GB');
    $('#flow-input').textContent = labels[index] + ' posts';
    $('#flow-percent').textContent = percentages[1];
    $('#flow-message').textContent = 'of reader-labelled ' + labels[index] + ' posts were predicted NEUTRAL.';
    counts.forEach((value, i) => {
      $('[data-flow-segment="' + i + '"]').style.flexGrow = String(value);
      $('[data-flow-count="' + i + '"]').textContent = String(value);
      $('[data-flow-percent="' + i + '"]').textContent = percentages[i];
    });
    const recovered = option.textContent + ' recovered ' + counts[index] + ' of ' + total + ' ' + labels[index] + ' posts.';
    $('#flow-note').textContent = recovered + ' Percentages are within the selected reader class and may differ from 100% in total because of rounding.';
    $('#flow-announcement').textContent = announce ? recovered + ' Predictions: ' + labels.map((label, i) => label + ' ' + counts[i]).join(', ') + '.' : '';
  };
  flowModel.addEventListener('change', () => updateFlow());
  flowLabel.addEventListener('change', () => updateFlow());
  updateFlow(false);

  const promptModel = $('#prompt-model');
  const updatePrompt = (announce = true) => {
    const option = promptModel.selectedOptions[0];
    const values = JSON.parse(option.dataset.f1);
    const neutral = JSON.parse(option.dataset.neutral);
    $$('[data-prompt-row]').forEach((row, i) => {
      $('[data-prompt-score]', row).textContent = values[i].toFixed(1);
      $('.poster-bar', row).style.setProperty('--score', values[i] + '%');
    });
    const delta = values[3] - values[0];
    const insight = option.textContent + (delta >= 0 ? ' gains ' : ' loses ') + Math.abs(delta).toFixed(1) + ' Macro-F1 points with cue-explicit prompting ' + (delta >= 0 ? 'over' : 'versus') + ' zero-shot.';
    $('#prompt-insight').textContent = insight;
    $('#prompt-neutral').textContent = 'Its share of NEUTRAL predictions changes from ' + neutral[0].toFixed(1) + '% to ' + neutral[3].toFixed(1) + '%.';
    $('#prompt-announcement').textContent = announce ? insight : '';
  };
  promptModel.addEventListener('change', () => updatePrompt());
  updatePrompt(false);

  // Browsers can restore form values after reload or back/forward navigation.
  // Wait for restoration to settle, then match every chart without unsolicited announcements.
  window.addEventListener('pageshow', () => window.requestAnimationFrame(() => {
    updatePerformance(false);
    updateFlow(false);
    updatePrompt(false);
  }));

  $('#poster-copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('https://zhao4hua4.github.io/work/xhs-score/poster/');
      $('#poster-copy-status').textContent = 'Link copied.';
    } catch (_) {
      $('#poster-copy-status').textContent = 'Copy this page’s address from your browser.';
    }
  });

  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!reduced.matches) entry.target.classList.add('poster-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    $$('.poster-reveal').forEach(node => reveals.observe(node));
    const navLinks = $$('.poster-nav a');
    const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const active = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (!visible.length) return;
      const id = visible[visible.length - 1].target.id;
      navLinks.forEach(link => {
        if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    sections.forEach(section => active.observe(section));
  }
  let ticking = false;
  const progress = $('.poster-progress span');
  const updateProgress = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0) + ')';
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateProgress); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
})();

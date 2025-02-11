function gradioApp() {
  const elems = document.getElementsByTagName('gradio-app');
  const elem = elems.length === 0 ? document : elems[0];
  if (elem !== document) elem.getElementById = function (id) { return document.getElementById(id); };
  return elem.shadowRoot ? elem.shadowRoot : elem;
}

function get_uiCurrentTab() {
  return gradioApp().querySelector('#tabs button.selected');
}

function get_uiCurrentTabContent() {
  return gradioApp().querySelector('.tabitem[id^=tab_]:not([style*="display: none"])');
}

const uiAfterUpdateCallbacks = [];
const uiUpdateCallbacks = [];
const uiLoadedCallbacks = [];
const uiTabChangeCallbacks = [];
const optionsChangedCallbacks = [];
let uiCurrentTab = null;
let uiAfterUpdateTimeout = null;

function onAfterUiUpdate(callback) {
  uiAfterUpdateCallbacks.push(callback);
}

function onUiUpdate(callback) {
  uiUpdateCallbacks.push(callback);
}

function onUiLoaded(callback) {
  uiLoadedCallbacks.push(callback);
}

function onUiTabChange(callback) {
  uiTabChangeCallbacks.push(callback);
}

function onOptionsChanged(callback) {
  optionsChangedCallbacks.push(callback);
}

function executeCallbacks(queue, arg) {
  // if (!uiLoaded) return
  for (const callback of queue) {
      try {
          callback(arg);
      } catch (e) {
          console.error("error running callback", callback, ":", e);
      }
  }
}

function scheduleAfterUiUpdateCallbacks() {
  clearTimeout(uiAfterUpdateTimeout);
  uiAfterUpdateTimeout = setTimeout(() => executeCallbacks(uiAfterUpdateCallbacks, 500));
}

let executedOnLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
  const mutationObserver = new MutationObserver((m) => {
    if (!executedOnLoaded && gradioApp().querySelector('#txt2img_prompt')) {
      executedOnLoaded = true;
      executeCallbacks(uiLoadedCallbacks);
    }
    executeCallbacks(uiUpdateCallbacks, m);
    scheduleAfterUiUpdateCallbacks();
    const newTab = get_uiCurrentTab();
    if (newTab && (newTab !== uiCurrentTab)) {
      uiCurrentTab = newTab;
      executeCallbacks(uiTabChangeCallbacks);
    }
  });
  mutationObserver.observe(gradioApp(), { childList: true, subtree: true });
});

/**
 * Add a ctrl+enter as a shortcut to start a generation
 */
document.addEventListener('keydown', (e) => {
  let handled = false;
  if (e.key !== undefined) {
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.altKey))) handled = true;
  } else if (e.keyCode !== undefined) {
    if ((e.keyCode === 13 && (e.metaKey || e.ctrlKey || e.altKey))) handled = true;
  }
  if (handled) {
    button = get_uiCurrentTabContent().querySelector('button[id$=_generate]');
    if (button) button.click();
    e.preventDefault();
  }
});

/**
 * checks that a UI element is not in another hidden element or tab content
 */
function uiElementIsVisible(el) {
  let isVisible = !el.closest('.\\!hidden');
  if (!isVisible) return false;
  while (isVisible = el.closest('.tabitem')?.style.display !== 'none') {
    if (!isVisible) return false;
    if (el.parentElement) el = el.parentElement;
    else break;
  }
  return isVisible;
}

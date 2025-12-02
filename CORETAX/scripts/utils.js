function formatCurrency(amount) {
  return window.taxCalc ? window.taxCalc.formatCurrency(amount) : amount;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

function createElement(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html !== undefined) el.innerHTML = html;
  return el;
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setVisible(node, show) {
  if (!node) return;
  node.style.display = show ? '' : 'none';
}

// ===== ANIMATION UTILITIES =====

// Animate element with class
function animateElement(element, animationClass, duration = 400) {
  return new Promise((resolve) => {
    if (!element) return resolve();
    element.classList.add(animationClass);
    setTimeout(() => {
      element.classList.remove(animationClass);
      resolve();
    }, duration);
  });
}

// Stagger animate children
function staggerAnimate(container, itemSelector = '.stagger-item', delayMs = 50) {
  const items = container.querySelectorAll(itemSelector);
  items.forEach((item, index) => {
    item.style.animationDelay = `${index * delayMs}ms`;
    item.classList.add('animated');
  });
}

// Animate number counting up
function animateNumber(element, endValue, duration = 1000, prefix = '', suffix = '') {
  if (!element) return;
  const startValue = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(startValue + (endValue - startValue) * easeProgress);
    element.textContent = prefix + currentValue.toLocaleString('id-ID') + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// Animate currency counting up
function animateCurrency(element, endValue, duration = 1000) {
  if (!element) return;
  const startValue = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(startValue + (endValue - startValue) * easeProgress);
    element.textContent = formatCurrency(currentValue);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toasts
  document.querySelectorAll('.toast-notification').forEach(t => t.remove());
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  
  const icons = {
    success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast-notification fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg ${colors[type]} toast`;
  toast.innerHTML = `${icons[type]}<span>${message}</span>`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
}

// Confirm dialog with animation
function showConfirm(title, message, onConfirm, onCancel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop';
  backdrop.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full mx-4 modal-content shadow-2xl">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-600">${message}</p>
      </div>
      <div class="flex gap-3 p-4 border-t border-gray-200">
        <button class="confirm-cancel flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors btn-press">Batal</button>
        <button class="confirm-ok flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors btn-press ripple-btn">Konfirmasi</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(backdrop);
  
  const closeModal = () => {
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.2s ease';
    setTimeout(() => backdrop.remove(), 200);
  };
  
  backdrop.querySelector('.confirm-cancel').addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
  
  backdrop.querySelector('.confirm-ok').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
  
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
      if (onCancel) onCancel();
    }
  });
}

// Loading spinner
function showLoading(container, message = 'Memuat...') {
  const loader = document.createElement('div');
  loader.className = 'loading-overlay flex flex-col items-center justify-center py-12 animate-fade-in';
  loader.innerHTML = `
    <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin-slow mb-4"></div>
    <p class="text-gray-600">${message}</p>
  `;
  if (container) {
    container.innerHTML = '';
    container.appendChild(loader);
  }
  return loader;
}

// Hide loading
function hideLoading(container) {
  const loader = container.querySelector('.loading-overlay');
  if (loader) {
    loader.classList.add('animate-fade-out');
    setTimeout(() => loader.remove(), 300);
  }
}

// Skeleton loading placeholder
function showSkeleton(container, rows = 3) {
  const skeleton = document.createElement('div');
  skeleton.className = 'skeleton-container space-y-4 animate-fade-in';
  for (let i = 0; i < rows; i++) {
    skeleton.innerHTML += `
      <div class="flex gap-4">
        <div class="skeleton w-12 h-12 rounded-lg"></div>
        <div class="flex-1 space-y-2">
          <div class="skeleton h-4 w-3/4 rounded"></div>
          <div class="skeleton h-3 w-1/2 rounded"></div>
        </div>
      </div>
    `;
  }
  if (container) {
    container.innerHTML = '';
    container.appendChild(skeleton);
  }
  return skeleton;
}

// Smooth scroll to element
function smoothScrollTo(element, offset = 0) {
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// Add ripple effect to button
function addRipple(button) {
  button.classList.add('ripple-btn');
}

// Typewriter effect
function typeWriter(element, text, speed = 50) {
  return new Promise((resolve) => {
    if (!element) return resolve();
    element.textContent = '';
    let i = 0;
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    }
    type();
  });
}

// Progress bar animation
function animateProgress(element, targetPercent, duration = 1000) {
  if (!element) return;
  element.style.width = '0%';
  element.style.transition = `width ${duration}ms ease-out`;
  requestAnimationFrame(() => {
    element.style.width = targetPercent + '%';
  });
}

// Shake animation for errors
function shakeElement(element) {
  if (!element) return;
  element.style.animation = 'none';
  element.offsetHeight; // Trigger reflow
  element.style.animation = 'shake 0.5s ease-in-out';
}

// Add shake keyframes
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(shakeStyle);

// Success animation with checkmark
function showSuccess(container, message = 'Berhasil!') {
  const success = document.createElement('div');
  success.className = 'flex flex-col items-center justify-center py-8 animate-scale-in';
  success.innerHTML = `
    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
      <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path class="checkmark-animate" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
    <p class="text-gray-900 font-semibold">${message}</p>
  `;
  if (container) {
    container.innerHTML = '';
    container.appendChild(success);
  }
  return success;
}

// Intersection observer for scroll animations
function observeElements(selector, animationClass = 'animate-slide-up') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add(animationClass);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

// Debounce function for performance
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for performance
function throttle(func, limit = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

window.utils = {
  formatCurrency,
  formatDate,
  formatDateTime,
  generateId,
  createElement,
  clearChildren,
  delay,
  setVisible,
  // Animation utilities
  animateElement,
  staggerAnimate,
  animateNumber,
  animateCurrency,
  showToast,
  showConfirm,
  showLoading,
  hideLoading,
  showSkeleton,
  smoothScrollTo,
  addRipple,
  typeWriter,
  animateProgress,
  shakeElement,
  showSuccess,
  observeElements,
  debounce,
  throttle,
};

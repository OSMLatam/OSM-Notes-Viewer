// Share component for sharing links
import { analytics } from '../utils/analytics.js';
import { i18n } from '../utils/i18n.js';

/**
 * Share component for sharing pages via various methods
 */
export class ShareComponent {
  constructor() {
    this.shareSupported = 'share' in navigator;
  }

  /**
   * Show share options
   * @param {Object} options - Share options
   * @param {string} options.title - Page title
   * @param {string} options.text - Share text
   * @param {string} options.url - URL to share
   */
  async share(options) {
    const { title, text, url } = options;
    const currentUrl = url || window.location.href;

    // Try native Web Share API first
    if (this.shareSupported) {
      try {
        await navigator.share({
          title: title || document.title,
          text: text || '',
          url: currentUrl,
        });

        analytics.trackShare('native', 'web_share');
        return true;
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
        return false;
      }
    }

    // Fallback to copy to clipboard
    return this.copyToClipboard(currentUrl);
  }

  /**
   * Copy URL to clipboard
   * @param {string} url - URL to copy
   */
  async copyToClipboard(url) {
    try {
      await navigator.clipboard.writeText(url);

      // Show feedback
      const message = i18n.t('share.copied') || 'Link copied to clipboard!';
      this.showToast(message);

      analytics.trackShare('clipboard', 'copy_link');
      return true;
    } catch (error) {
      console.error('Copy failed:', error);

      // Fallback to old method
      return this.fallbackCopy(url);
    }
  }

  /**
   * Fallback copy method for older browsers
   * @param {string} url - URL to copy
   */
  fallbackCopy(url) {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      const message = i18n.t('share.copied') || 'Link copied to clipboard!';
      this.showToast(message);
      analytics.trackShare('clipboard', 'copy_link_fallback');
      return true;
    } catch (error) {
      console.error('Fallback copy failed:', error);
      const errorMessage = i18n.t('share.failed') || 'Failed to copy link';
      this.showToast(errorMessage, 'error');
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Share to specific social media platform
   * @param {string} platform - Platform name (twitter, facebook, linkedin)
   * @param {Object} options - Share options
   */
  shareToSocial(platform, options) {
    const { title, text, url } = options;
    const currentUrl = encodeURIComponent(url || window.location.href);
    const shareText = encodeURIComponent(text || title || document.title);

    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${shareText}%20%23OpenStreetMap&url=${currentUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
        break;
      case 'linkedin':
        // Copy text to clipboard for LinkedIn since it doesn't accept pre-filled text
        this.copyToClipboard(`${text || title || document.title} ${url || window.location.href}`);
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${shareText}%20${currentUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${currentUrl}&text=${shareText}`;
        break;
      default:
        console.error('Unknown platform:', platform);
        return false;
    }

    // Open in new window
    window.open(shareUrl, '_blank', 'width=600,height=400');

    // Show toast for LinkedIn to remind user to paste
    if (platform === 'linkedin') {
      setTimeout(() => {
        const message =
          i18n.t('share.linkedin.pasteReminder') ||
          'Text copied to clipboard! Paste it in your LinkedIn post.';
        this.showToast(message, 'success');
      }, 500);
    }

    analytics.trackShare(platform, 'social_share');
    return true;
  }

  /**
   * Show toast notification
   * @param {string} message - Message to show
   * @param {string} type - Toast type (success, error)
   */
  showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.share-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `share-toast share-toast-${type}`;
    toast.textContent = message;

    // Add styles
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: type === 'error' ? '#f44336' : '#4caf50',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      zIndex: '10000',
      animation: 'slideInUp 0.3s ease',
      maxWidth: '300px',
      fontSize: '0.9rem',
    });

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Create share button HTML
   * @param {Object} options - Button options
   * @returns {string} HTML string
   */
  createShareButton(options = {}) {
    const { type = 'button', size = 'medium', icon = true } = options;

    return `
            <button class="share-btn share-btn-${size}" ${type === 'button' ? 'type="button"' : ''}>
                ${icon ? '<span class="share-icon">🔗</span>' : ''}
                <span class="share-text">Share</span>
            </button>
        `;
  }

  /**
   * Render share dropdown menu
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Share options
   */
  renderShareMenu(container, options) {
    const { title, text, url } = options;

    container.innerHTML = `
            <div class="share-menu">
                <div class="share-menu-header">
                    <h4>Share</h4>
                </div>
                <div class="share-menu-options">
                    ${
                      this.shareSupported
                        ? `
                        <button class="share-option" data-action="native">
                            <span class="share-option-icon">📱</span>
                            <span class="share-option-text">Share via...</span>
                        </button>
                    `
                        : ''
                    }
                    <button class="share-option" data-action="copy">
                        <span class="share-option-icon">📋</span>
                        <span class="share-option-text">Copy link</span>
                    </button>
                    <div class="share-divider"></div>
                    <button class="share-option" data-action="twitter">
                        <span class="share-option-icon">🐦</span>
                        <span class="share-option-text">Twitter</span>
                    </button>
                    <button class="share-option" data-action="facebook">
                        <span class="share-option-icon">📘</span>
                        <span class="share-option-text">Facebook</span>
                    </button>
                    <button class="share-option" data-action="linkedin">
                        <span class="share-option-icon">💼</span>
                        <span class="share-option-text">LinkedIn</span>
                    </button>
                    <button class="share-option" data-action="whatsapp">
                        <span class="share-option-icon">💬</span>
                        <span class="share-option-text">WhatsApp</span>
                    </button>
                    <button class="share-option" data-action="telegram">
                        <span class="share-option-icon">✈️</span>
                        <span class="share-option-text">Telegram</span>
                    </button>
                </div>
            </div>
        `;

    // Add event listeners
    container.querySelectorAll('.share-option').forEach((option) => {
      option.addEventListener('click', async (e) => {
        const action = e.currentTarget.dataset.action;

        switch (action) {
          case 'native':
            await this.share({ title, text, url });
            break;
          case 'copy':
            await this.copyToClipboard(url || window.location.href);
            break;
          default:
            this.shareToSocial(action, { title, text, url });
            break;
        }

        // Close menu
        container.innerHTML = '';
      });
    });
  }
}

// Export singleton instance
export const shareComponent = new ShareComponent();

// Add CSS animations
if (!document.querySelector('#share-animations')) {
  const style = document.createElement('style');
  style.id = 'share-animations';
  style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes slideOutDown {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(100%);
                opacity: 0;
            }
        }
    `;
  document.head.appendChild(style);
}

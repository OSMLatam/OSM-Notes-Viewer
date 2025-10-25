// Animation Manager - Handles dynamic animations and transitions
export class AnimationManager {
    constructor() {
        this.observers = new Map();
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupScrollAnimations();
        this.setupClickAnimations();
        this.setupFormAnimations();
    }

    // Setup intersection observer for scroll-triggered animations
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.triggerAnimation(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe elements with animation classes
        document.querySelectorAll('[class*="animate-"]').forEach(el => {
            observer.observe(el);
        });
    }

    // Trigger animation on element
    triggerAnimation(element) {
        const animationClass = this.getAnimationClass(element);
        if (animationClass) {
            element.classList.add(animationClass);
        }
    }

    // Get animation class from element
    getAnimationClass(element) {
        const classes = element.className.split(' ');
        return classes.find(cls => cls.startsWith('animate-'));
    }

    // Setup scroll-based animations
    setupScrollAnimations() {
        let ticking = false;

        const updateScrollAnimations = () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.parallax');

            parallaxElements.forEach(element => {
                const speed = element.dataset.speed || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });

            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollAnimations);
                ticking = true;
            }
        });
    }

    // Setup click animations
    setupClickAnimations() {
        // Button ripple effect
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn, .clickable')) {
                this.createRippleEffect(e);
            }
        });

        // Card click animations
        document.addEventListener('click', (e) => {
            if (e.target.closest('.card')) {
                const card = e.target.closest('.card');
                this.animateCardClick(card);
            }
        });
    }

    // Create ripple effect on button click
    createRippleEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Animate card click
    animateCardClick(card) {
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
    }

    // Setup form animations
    setupFormAnimations() {
        // Input focus animations
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea, select')) {
                e.target.parentElement.classList.add('focused');
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.matches('input, textarea, select')) {
                e.target.parentElement.classList.remove('focused');
            }
        });

        // Form validation animations
        document.addEventListener('invalid', (e) => {
            if (e.target.matches('input, textarea, select')) {
                e.target.classList.add('invalid');
                this.shakeElement(e.target);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                e.target.classList.remove('invalid');
            }
        });
    }

    // Shake element animation
    shakeElement(element) {
        element.style.animation = 'wiggle 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    // Animate loading states
    showLoading(element, message = 'Loading...') {
        element.classList.add('loading');
        element.setAttribute('aria-busy', 'true');

        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = message;
        element.appendChild(loadingText);
    }

    hideLoading(element) {
        element.classList.remove('loading');
        element.removeAttribute('aria-busy');

        const loadingText = element.querySelector('.loading-text');
        if (loadingText) {
            loadingText.remove();
        }
    }

    // Animate data updates
    animateCounter(element, startValue, endValue, duration = 1000) {
        const startTime = performance.now();
        const difference = endValue - startValue;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = startValue + (difference * this.easeOutCubic(progress));
            element.textContent = Math.floor(currentValue).toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    }

    // Easing function
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Animate chart data
    animateChart(chartElement, data) {
        const bars = chartElement.querySelectorAll('.chart-bar');

        bars.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.transform = 'scaleY(1)';
                bar.style.opacity = '1';
            }, index * 100);
        });
    }

    // Animate list items
    animateListItems(listElement) {
        const items = listElement.querySelectorAll('.list-item');

        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Animate search results
    animateSearchResults(resultsContainer, results) {
        resultsContainer.innerHTML = '';

        results.forEach((result, index) => {
            setTimeout(() => {
                const resultElement = this.createSearchResultElement(result);
                resultElement.style.opacity = '0';
                resultElement.style.transform = 'translateX(-20px)';

                resultsContainer.appendChild(resultElement);

                setTimeout(() => {
                    resultElement.style.transition = 'all 0.3s ease';
                    resultElement.style.opacity = '1';
                    resultElement.style.transform = 'translateX(0)';
                }, 50);
            }, index * 100);
        });
    }

    createSearchResultElement(result) {
        const element = document.createElement('div');
        element.className = 'search-result-item stagger-item';
        element.innerHTML = `
            <div class="result-content">
                <h4>${result.title}</h4>
                <p>${result.description}</p>
            </div>
        `;
        return element;
    }

    // Animate theme transitions
    animateThemeTransition() {
        document.body.classList.add('theme-transition');

        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }

    // Animate page transitions
    animatePageTransition(direction = 'forward') {
        const mainContent = document.querySelector('#main-content');

        if (direction === 'forward') {
            mainContent.style.animation = 'fadeInUp 0.3s ease';
        } else {
            mainContent.style.animation = 'fadeInDown 0.3s ease';
        }

        setTimeout(() => {
            mainContent.style.animation = '';
        }, 300);
    }

    // Animate toast notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Animate error states
    showError(element, message) {
        element.classList.add('error');
        element.style.animation = 'wiggle 0.5s ease';

        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        element.appendChild(errorMessage);

        setTimeout(() => {
            element.classList.remove('error');
            element.style.animation = '';
            errorMessage.remove();
        }, 3000);
    }

    // Animate success states
    showSuccess(element, message) {
        element.classList.add('success');

        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = message;
        element.appendChild(successMessage);

        setTimeout(() => {
            element.classList.remove('success');
            successMessage.remove();
        }, 3000);
    }
}

// Initialize animation manager
export const animationManager = new AnimationManager();

// Add ripple animation keyframes
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

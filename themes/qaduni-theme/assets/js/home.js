// Leadership Slider
document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.leadership-slide');
    const dots = document.querySelectorAll('.slider-dot');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    // Only proceed if elements exist
    if (slides.length === 0) return;

    let currentSlide = 0;
    let autoSlideInterval;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        if(slides[index]) slides[index].classList.add('active');
        if(dots[index]) dots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        let next = currentSlide + 1;
        if (next >= slides.length) next = 0;
        showSlide(next);
    }

    function prevSlide() {
        let prev = currentSlide - 1;
        if (prev < 0) prev = slides.length - 1;
        showSlide(prev);
    }

    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoSlide();
        });
    }

    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoSlide();
        });
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            showSlide(parseInt(dot.dataset.slide));
            resetAutoSlide();
        });
    });

    startAutoSlide();
    const counterSection = document.querySelector('.visitor-counter-section');
    if (counterSection) {
        function animateCounter(elementId, target, duration = 2000) {
            const element = document.getElementById(elementId);
            if (!element) return;
            const start = 0;
            const increment = target / (duration / 16);
            let current = start;

            function updateCounter() {
                current += increment;
                if (current < target) {
                    element.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    element.textContent = target.toLocaleString();
                }
            }

            updateCounter();
        }

        const endpoint = counterSection.dataset.endpoint;
        if (!endpoint) {
            counterSection.hidden = true;
        } else {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        observer.unobserve(entry.target);
                        fetch(endpoint, { credentials: 'omit' })
                            .then(r => {
                                if (!r.ok) throw new Error('HTTP ' + r.status);
                                return r.json();
                            })
                            .then(data => {
                                animateCounter('today-visitors', data.today || 0);
                                animateCounter('total-visitors', data.total || 0);
                                animateCounter('online-visitors', data.online || 0);
                            })
                            .catch(() => { counterSection.hidden = true; });
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(counterSection);
        }
    }
});

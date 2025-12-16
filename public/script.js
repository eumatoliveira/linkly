// API Configuration
const API_BASE = window.location.origin;

// DOM Elements
const shortenForm = document.getElementById('shortenForm');
const urlInput = document.getElementById('urlInput');
const shortenBtn = document.getElementById('shortenBtn');
const resultContainer = document.getElementById('resultContainer');
const shortUrlDisplay = document.getElementById('shortUrlDisplay');
const copyBtn = document.getElementById('copyBtn');
const shortCode = document.getElementById('shortCode');
const originalUrl = document.getElementById('originalUrl');
const viewStatsBtn = document.getElementById('viewStatsBtn');
const statsSection = document.getElementById('statsSection');
const expirationToggle = document.getElementById('expirationToggle');
const expirationInput = document.getElementById('expirationInput');
const expirationDate = document.getElementById('expirationDate');

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Expiration toggle handler
expirationToggle.addEventListener('change', (e) => {
    expirationInput.style.display = e.target.checked ? 'block' : 'none';
    
    // Set default to 7 days from now
    if (e.target.checked && !expirationDate.value) {
        const future = new Date();
        future.setDate(future.getDate() + 7);
        expirationDate.value = future.toISOString().slice(0, 16);
    }
});

// Form submission
shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = urlInput.value.trim();
    
    if (!url) {
        showToast('❌ Por favor, insira uma URL');
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (error) {
        showToast('❌ URL inválida. Inclua http:// ou https://');
        return;
    }
    
    // Show loading state
    shortenBtn.classList.add('loading');
    shortenBtn.disabled = true;
    
    try {
        const body = { url };
        
        // Add expiration if enabled
        if (expirationToggle.checked && expirationDate.value) {
            body.expires_at = new Date(expirationDate.value).toISOString();
        }
        
        const response = await fetch(`${API_BASE}/api/shorten`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao encurtar URL');
        }
        
        const data = await response.json();
        
        // Display result
        shortUrlDisplay.value = data.shortUrl;
        shortCode.textContent = data.shortCode;
        originalUrl.textContent = data.originalUrl;
        originalUrl.title = data.originalUrl; // Tooltip for full URL
        
        // Show result container with animation
        resultContainer.style.display = 'block';
        statsSection.style.display = 'none';
        
        // Show success message
        if (data.isNew) {
            showToast('✅ URL encurtada com sucesso!');
        } else {
            showToast('✅ URL encontrada! (já existia)');
        }
        
        // Store current short code for stats
        window.currentShortCode = data.shortCode;
        
    } catch (error) {
        console.error('Error shortening URL:', error);
        showToast(`❌ ${error.message}`);
    } finally {
        shortenBtn.classList.remove('loading');
        shortenBtn.disabled = false;
    }
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
    const url = shortUrlDisplay.value;
    
    try {
        await navigator.clipboard.writeText(url);
        
        // Update button state
        const copyText = copyBtn.querySelector('.copy-text');
        const originalText = copyText.textContent;
        
        copyBtn.classList.add('copied');
        copyText.textContent = 'Copiado!';
        
        showToast('📋 URL copiada para clipboard!');
        
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyText.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('❌ Erro ao copiar. Tente manualmente.');
    }
});

// View stats
viewStatsBtn.addEventListener('click', async () => {
    if (!window.currentShortCode) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/stats/${window.currentShortCode}`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar estatísticas');
        }
        
        const stats = await response.json();
        
        // Update stats display
        document.getElementById('clickCount').textContent = stats.click_count || 0;
        document.getElementById('createdAt').textContent = new Date(stats.created_at).toLocaleString('pt-BR');
        
        if (stats.expires_at) {
            document.getElementById('expiresAt').textContent = new Date(stats.expires_at).toLocaleString('pt-BR');
        } else {
            document.getElementById('expiresAt').textContent = 'Nunca';
        }
        
        // Show stats section with animation
        statsSection.style.display = 'block';
        statsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        showToast('❌ Erro ao carregar estatísticas');
    }
});

// Auto-select URL on click for easy copying
shortUrlDisplay.addEventListener('click', function() {
    this.select();
});

// Enter key on input focuses button
urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        shortenForm.dispatchEvent(new Event('submit'));
    }
});

// Keyboard shortcut: Ctrl/Cmd + K to focus input
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        urlInput.focus();
    }
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add micro-interactions to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});

// Animate stats when they become visible
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe stats section
if (statsSection) {
    statsSection.style.opacity = '0';
    statsSection.style.transform = 'translateY(20px)';
    statsSection.style.transition = 'all 0.6s ease-out';
    observer.observe(statsSection);
}

// Print debug info in console for developers
console.log('%c🔗 Linkly URL Shortener', 'font-size: 24px; font-weight: bold; color: #667eea;');
console.log('%cProduction-ready architecture with Base62 encoding', 'color: #888;');
console.log('%cAPI Base:', API_BASE);
console.log('%cKeyboard shortcuts:', 'font-weight: bold;');
console.log('  Ctrl/Cmd + K: Focus URL input');
console.log('  Enter: Submit form');

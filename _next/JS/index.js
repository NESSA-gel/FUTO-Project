// index.js - Production Authentication for your main page
// This replaces your existing index.js file

// Modal functions
function openModal(type) {
    const modalId = type === 'login' ? 'loginModal' : 'signupModal';
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
    clearMessages();
}

function switchModal(fromModal, toModal) {
    document.getElementById(fromModal).style.display = 'none';
    document.getElementById(toModal).style.display = 'block';
    clearMessages();
}

function clearMessages() {
    const messages = document.querySelectorAll('.error-message, .success-message');
    messages.forEach(msg => msg.style.display = 'none');
}

function showMessage(elementId, message, isError = true) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = message;
    element.style.display = 'block';
    
    // Hide other message types
    const otherType = isError ? elementId.replace('Error', 'Success') : elementId.replace('Success', 'Error');
    const otherElement = document.getElementById(otherType);
    if (otherElement) otherElement.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            clearMessages();
        }
    });
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            // Validation
            if (!email || !password) {
                showMessage('loginError', 'Please fill in all fields', true);
                return;
            }

            // Show loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;
            clearMessages();

            try {
                console.log('🔐 Attempting login for:', email);
                const result = await window.supabaseManager.signIn(email, password);

                if (result.success) {
                    showMessage('loginSuccess', 'Login successful! Redirecting...', false);
                    
                    // Store session info
                    sessionStorage.setItem('futo_user_session', JSON.stringify({
                        email: email,
                        userId: result.data.user.id,
                        loggedIn: true,
                        timestamp: Date.now()
                    }));
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = './test.html';
                    }, 1500);
                    
                } else {
                    showMessage('loginError', result.error || 'Login failed', true);
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('loginError', 'An unexpected error occurred', true);
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Signup form handler
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitBtn = this.querySelector('button[type="submit"]');

            // Validation
            if (!name || !email || !password || !confirmPassword) {
                showMessage('signupError', 'Please fill in all fields', true);
                return;
            }

            if (password !== confirmPassword) {
                showMessage('signupError', 'Passwords do not match', true);
                return;
            }

            if (password.length < 6) {
                showMessage('signupError', 'Password must be at least 6 characters', true);
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('signupError', 'Please enter a valid email address', true);
                return;
            }

            // Show loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating account...';
            submitBtn.disabled = true;
            clearMessages();

            try {
                console.log('📝 Attempting registration for:', email);
                const result = await window.supabaseManager.signUp(email, password, {
                    full_name: name
                });

                if (result.success) {
                    showMessage('signupSuccess', 
                        'Account created successfully! Please check your email to verify your account before signing in.',
                        false
                    );
                    
                    // Clear form
                    this.reset();
                    
                    // Switch to login modal after delay
                    setTimeout(() => {
                        switchModal('signupModal', 'loginModal');
                    }, 3000);
                    
                } else {
                    showMessage('signupError', result.error || 'Registration failed', true);
                }
            } catch (error) {
                console.error('Signup error:', error);
                showMessage('signupError', 'An unexpected error occurred', true);
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Check if user is already logged in
    checkExistingAuth();
    
    // Add stagger animation to elements
    const animatedElements = document.querySelectorAll('.hero > *');
    animatedElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.2}s`;
    });
});

// Check for existing authentication
async function checkExistingAuth() {
    try {
        // Check session storage first
        const userSession = sessionStorage.getItem('futo_user_session');
        if (userSession) {
            const session = JSON.parse(userSession);
            // Check if session is still valid (24 hours)
            if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
                console.log('📋 Found valid session, checking with Supabase...');
                
                // Verify with Supabase
                const { user } = await window.supabaseManager.getCurrentUser();
                if (user) {
                    console.log('✅ User already authenticated, redirecting to dashboard...');
                    window.location.href = './test.html';
                    return;
                }
            }
            // Clear invalid session
            sessionStorage.removeItem('futo_user_session');
        }

        // Set up auth state listener
        window.supabaseManager.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('✅ User signed in:', session.user.email);
                
                // Store session
                sessionStorage.setItem('futo_user_session', JSON.stringify({
                    email: session.user.email,
                    userId: session.user.id,
                    loggedIn: true,
                    timestamp: Date.now()
                }));
                
                // Redirect to dashboard
                window.location.href = './test.html';
                
            } else if (event === 'SIGNED_OUT') {
                console.log('🚪 User signed out');
                sessionStorage.removeItem('futo_user_session');
            }
        });
        
    } catch (error) {
        console.error('Error checking authentication:', error);
    }
}

// Mobile menu functions
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    document.body.addEventListener('click', closeMenuOnClickOutside, { once: true });
}

function closeMenuOnClickOutside(e) {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.querySelector('.mobile-menu-toggle');
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
        menu.style.display = 'none';
    }
}

// Clearance Requirements Animation
let currentRequirement = 0;
const requirements = document.querySelectorAll('.requirement-item');
const dots = document.querySelectorAll('.dot');
const totalRequirements = requirements.length;

function showRequirement(index) {
    if (requirements.length === 0) return;
    
    requirements.forEach(req => req.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    if (requirements[index] && dots[index]) {
        requirements[index].classList.add('active');
        dots[index].classList.add('active');
    }
}

function nextRequirement() {
    if (totalRequirements === 0) return;
    currentRequirement = (currentRequirement + 1) % totalRequirements;
    showRequirement(currentRequirement);
}

// Initialize requirements animation
if (requirements.length > 0) {
    let requirementInterval = setInterval(nextRequirement, 3000);

    // Add click handlers for dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentRequirement = index;
            showRequirement(currentRequirement);
            
            // Reset interval
            clearInterval(requirementInterval);
            requirementInterval = setInterval(nextRequirement, 3000);
        });
    });

    // Pause animation on hover
    const requirementsSection = document.querySelector('.clearance-requirements');
    if (requirementsSection) {
        showRequirement(0);

        requirementsSection.addEventListener('mouseenter', () => {
            clearInterval(requirementInterval);
        });

        requirementsSection.addEventListener('mouseleave', () => {
            requirementInterval = setInterval(nextRequirement, 3000);
        });
    }
}
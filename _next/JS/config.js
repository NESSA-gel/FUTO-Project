// config.js - Production Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://xhmoiquraxurtdbyosqs.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobW9pcXVyYXh1cnRkYnlvc3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODMxMDcsImV4cCI6MjA2NTU1OTEwN30.dpT_ugdNysl-9aQ7YdegdXlEMvazVPFHOr5aBNljzpY'
};

// Production Supabase Manager
class SupabaseManager {
    constructor() {
        this.supabase = null;
        this.isReady = false;
        this.init();
    }

    async init() {
        try {
            // Wait for Supabase library to load
            let attempts = 0;
            while (typeof window.supabase === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase library failed to load');
            }

            // Create Supabase client
            this.supabase = window.supabase.createClient(
                SUPABASE_CONFIG.url, 
                SUPABASE_CONFIG.anonKey
            );

            this.isReady = true;
            console.log('✅ Supabase initialized successfully');
            
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error.message);
            throw error;
        }
    }

    async waitForReady() {
        while (!this.isReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async signUp(email, password, userData = {}) {
        await this.waitForReady();
        
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: userData.full_name || '',
                        ...userData
                    }
                }
            });

            if (error) {
                console.error('Signup error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ User registered successfully:', data);
            return { success: true, data: data };

        } catch (error) {
            console.error('Signup exception:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    }

    async signIn(email, password) {
        await this.waitForReady();
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ User logged in successfully:', data);
            return { success: true, data: data };

        } catch (error) {
            console.error('Login exception:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    }

    async signOut() {
        await this.waitForReady();
        
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ User logged out successfully');
            return { success: true };

        } catch (error) {
            console.error('Logout exception:', error);
            return { success: false, error: 'Logout failed' };
        }
    }

    async getCurrentUser() {
        await this.waitForReady();
        
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error) {
                console.error('Get user error:', error);
                return { user: null, error: error.message };
            }

            return { user: user };

        } catch (error) {
            console.error('Get user exception:', error);
            return { user: null, error: 'Failed to get user' };
        }
    }

    onAuthStateChange(callback) {
        if (!this.isReady) {
            console.log('Supabase not ready, setting up listener for when ready...');
            this.waitForReady().then(() => {
                this.supabase.auth.onAuthStateChange(callback);
            });
            return { data: { subscription: { unsubscribe: () => {} } } };
        }

        return this.supabase.auth.onAuthStateChange(callback);
    }

    // Utility method to check if user is authenticated
    async isAuthenticated() {
        const { user } = await this.getCurrentUser();
        return user !== null;
    }
}

// Initialize the manager
console.log('🚀 Initializing Supabase Manager...');
const supabaseManager = new SupabaseManager();

// Make it globally available
window.supabaseManager = supabaseManager;
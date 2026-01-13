import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// User type definition
export interface User {
    email: string;
    name: string;
    plan: 'free' | 'pro';
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<void>;
    signup: (email: string, name: string, password?: string) => Promise<void>;
    googleAuth: (token: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aidraw_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    }, []);

    const login = async (email: string, password?: string) => {
        // password is optional to support the existing code temporarily, 
        // but for real auth it should be required.
        // If password is not provided (e.g. existing calls?), we might throw or handle gracefully.
        // But we will update call sites.

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Valid credentials required');
            }

            const data = await response.json();
            // data: { token, email, name }
            const newUser: User = {
                email: data.email,
                name: data.name,
                plan: 'free' // backend doesn't return plan yet
            };
            saveUser(newUser, data.token);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const signup = async (email: string, name: string, password?: string) => {
        try {
            const response = await fetch('http://localhost:8080/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Signup failed');
            }

            const data = await response.json();
            const newUser: User = {
                email: data.email,
                name: data.name,
                plan: 'free'
            };
            saveUser(newUser, data.token);
        } catch (error) {
            console.error("Signup failed", error);
            throw error;
        }
    };

    const googleAuth = async (token: string) => {
        try {
            // For mock/test mode
            if (token.startsWith("mock_")) {
                const mockUser: User = {
                    email: "test_user@example.com",
                    name: "테스트 유저",
                    plan: 'free'
                };
                saveUser(mockUser, token);
                return;
            }

            const response = await fetch('http://localhost:8080/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                throw new Error('Google Auth Failed');
            }

            const data = await response.json();
            const newUser: User = {
                email: data.email,
                name: data.name,
                plan: 'free'
            };
            saveUser(newUser, data.token);
        } catch (error) {
            console.error("Google auth failed", error);
            throw error;
        }
    }

    const logout = () => {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem('aidraw_auth_token');
    };

    const saveUser = (u: User, token?: string) => {
        setUser(u);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(u));
        if (token) {
            localStorage.setItem('aidraw_auth_token', token);
        }
    };

    const value = {
        user,
        login,
        signup,
        googleAuth,
        logout,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

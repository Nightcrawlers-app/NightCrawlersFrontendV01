import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
    getCurrentCustomer,
    signInCustomer,
    createCustomerAccount,
    logoutCustomer,
    updateCustomerProfile,
    changeCustomerPassword,
    deleteCustomerAccount,
    getCustomerTransactions,
    addCustomerAddress,
    updateCustomerAddress,
    deleteCustomerAddress,
    setDefaultCustomerAddress,
    toErrorMessage,
} from '../services/api';
import type {
    CustomerProfile,
    UserAddress as UserAddressModel,
    Transaction as TransactionModel,
    OrderItemSummary,
} from '../types/models';

// The customer types live in types/models.ts (the backend data contract).
// Re-exported here so existing imports from AuthContext keep working.
export type UserAddress = UserAddressModel;
export type Transaction = TransactionModel;
export type OrderItem = OrderItemSummary;
export type UserProfile = CustomerProfile;

interface AuthContextType {
    user: UserProfile | null;
    transactions: Transaction[];
    isAuthenticated: boolean;
    /** True while any auth request is in flight, including the initial session check. */
    isLoading: boolean;
    /** True until the initial "am I signed in?" check completes. Guard redirects on this. */
    isInitializing: boolean;
    /** Last error from a profile/address/password action, for the UI to surface. */
    error: string;
    clearError: () => void;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (data: { username: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    addTransaction: (transaction: Transaction) => void;
    // Address management
    addAddress: (address: Omit<UserAddress, 'id'>) => Promise<void>;
    updateAddress: (id: string, updates: Partial<Omit<UserAddress, 'id'>>) => Promise<void>;
    deleteAddress: (id: string) => Promise<void>;
    setDefaultAddress: (id: string) => Promise<void>;
    // Password management
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    // Account management
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get user initials for avatar fallback
export const getInitials = (firstName: string, lastName: string): string => {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return f + l || '?';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState('');

    const clearError = useCallback(() => setError(''), []);

    const loadTransactions = useCallback(async () => {
        try {
            const history = await getCustomerTransactions();
            setTransactions(history);
        } catch {
            // Order history is secondary — a failure here shouldn't sign the
            // user out or block the profile page from rendering.
            setTransactions([]);
        }
    }, []);

    // Restore the session on first load. The session itself lives in an
    // httpOnly cookie, so we ask the backend who we are rather than reading
    // anything from localStorage.
    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            try {
                const currentUser = await getCurrentCustomer();
                if (cancelled) return;

                setUser(currentUser);
                if (currentUser) await loadTransactions();
            } catch {
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setIsInitializing(false);
            }
        };

        restoreSession();
        return () => {
            cancelled = true;
        };
    }, [loadTransactions]);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError('');
        try {
            const loggedIn = await signInCustomer(email, password);
            if (!loggedIn) return false;

            setUser(loggedIn);
            await loadTransactions();
            return true;
        } catch (err) {
            setError(toErrorMessage(err, 'Could not sign in. Please try again.'));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [loadTransactions]);

    const signup = useCallback(async (
        data: { username: string; email: string; password: string },
    ): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        setError('');
        try {
            const created = await createCustomerAccount(data);
            setUser(created);
            await loadTransactions();
            return { success: true };
        } catch (err) {
            const message = toErrorMessage(err, 'Could not create your account. Please try again.');
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    }, [loadTransactions]);

    const logout = useCallback(async () => {
        // Clear locally first so the UI updates immediately, then tell the
        // backend to drop the session cookie.
        setUser(null);
        setTransactions([]);
        try {
            await logoutCustomer();
        } catch {
            // Already signed out locally; a failed call here doesn't matter.
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        setError('');
        const previous = user;
        // Optimistic — show the change straight away, roll back if it fails.
        setUser(prev => (prev ? { ...prev, ...updates } : null));
        try {
            const saved = await updateCustomerProfile(updates);
            setUser(saved);
        } catch (err) {
            setUser(previous);
            setError(toErrorMessage(err, 'Could not save your changes.'));
        }
    }, [user]);

    const addTransaction = useCallback((transaction: Transaction) => {
        setTransactions(prev => [transaction, ...prev]);
    }, []);

    // ---- ADDRESS MANAGEMENT ----
    // Each endpoint returns the full updated profile, so the response is the
    // source of truth — no local re-derivation of which address is default.

    const addAddress = useCallback(async (address: Omit<UserAddress, 'id'>) => {
        setError('');
        try {
            setUser(await addCustomerAddress(address));
        } catch (err) {
            setError(toErrorMessage(err, 'Could not add that address.'));
        }
    }, []);

    const updateAddress = useCallback(async (id: string, updates: Partial<Omit<UserAddress, 'id'>>) => {
        setError('');
        try {
            setUser(await updateCustomerAddress(id, updates));
        } catch (err) {
            setError(toErrorMessage(err, 'Could not update that address.'));
        }
    }, []);

    const deleteAddress = useCallback(async (id: string) => {
        setError('');
        try {
            setUser(await deleteCustomerAddress(id));
        } catch (err) {
            setError(toErrorMessage(err, 'Could not delete that address.'));
        }
    }, []);

    const setDefaultAddress = useCallback(async (id: string) => {
        setError('');
        try {
            setUser(await setDefaultCustomerAddress(id));
        } catch (err) {
            setError(toErrorMessage(err, 'Could not set that address as default.'));
        }
    }, []);

    // ---- PASSWORD MANAGEMENT ----

    const changePassword = useCallback(async (
        currentPassword: string,
        newPassword: string,
    ): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        if (newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters' };
        }

        try {
            // The backend verifies the current password — the frontend has no
            // copy of it to check against, and shouldn't.
            await changeCustomerPassword(currentPassword, newPassword);
            return { success: true };
        } catch (err) {
            return { success: false, error: toErrorMessage(err, 'Failed to change password') };
        }
    }, [user]);

    // ---- ACCOUNT MANAGEMENT ----

    const deleteAccount = useCallback(async () => {
        setError('');
        try {
            await deleteCustomerAccount();
            setUser(null);
            setTransactions([]);
        } catch (err) {
            setError(toErrorMessage(err, 'Could not delete your account.'));
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                transactions,
                isAuthenticated: !!user,
                isLoading,
                isInitializing,
                error,
                clearError,
                login,
                signup,
                logout,
                updateProfile,
                addTransaction,
                addAddress,
                updateAddress,
                deleteAddress,
                setDefaultAddress,
                changePassword,
                deleteAccount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

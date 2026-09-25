import React, { useState } from 'react';
import PasswordInput from '../../components/ui/PasswordInput';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import logo from '../../assets/logo.png';
import { signInAdmin, toErrorMessage } from '../../services/api';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const AdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email.trim() || !password.trim()) {
            setErrorMessage('Credentials required.');
            return;
        }

        setLoading(true);
        try {
            const admin = await signInAdmin(email, password);
            if (!admin) {
                setErrorMessage('Access Denied: Invalid credentials.');
                return;
            }
            navigate('/admin-dashboard');
        } catch (error) {
            setErrorMessage(toErrorMessage(error, 'Could not sign in. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white relative font-poppins overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gray-50 opacity-60 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-50 opacity-40 rounded-full blur-[100px]" />

            <div className="w-full max-w-[1200px] mx-auto flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-[420px] bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">

                    <div className="flex flex-col items-center mb-10 pt-4">
                        <Link to="/" className="-mb-3 group">
                            <img
                                src={logo}
                                alt="Night Crawlers"
                                className="h-44 w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100 mb-3">
                            <ShieldCheck size={14} className="text-[#C62222]" />
                            <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Secure Admin Portal</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 text-center">Welcome Back</h1>
                        <p className="text-sm text-gray-400 text-center mt-1">Enter your credentials to access the console.</p>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-lg mb-6 text-center font-medium">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-300 focus:border-[#C62222] focus:ring-1 focus:ring-[#C62222] h-11"
                                placeholder="admin@nightcrawlers.ng"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
                            <PasswordInput
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-300 focus:border-[#C62222] focus:ring-1 focus:ring-[#C62222] h-11"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-[#111827] hover:bg-black text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-gray-200"
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Access Dashboard'}
                            {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                        </Button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-gray-50">
                        <p className="text-xs text-gray-400">
                            <span className="text-gray-500 font-medium">🔒 Restricted Access</span><br />
                            Contact system administrator for credentials.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;

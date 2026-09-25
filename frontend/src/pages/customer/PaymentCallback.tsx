import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { initializePayment, verifyPayment, toErrorMessage } from '../../services/api';

/**
 * Paystack sends the customer back here after checkout, as
 * /payment/callback?reference=NC-…  We ask OUR server whether the payment
 * really succeeded (it checks with Paystack) — the redirect itself proves nothing.
 */
const PaymentCallback: React.FC = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const reference = params.get('reference') || params.get('trxref');
    const [state, setState] = useState<'checking' | 'paid' | 'unpaid' | 'error'>(reference ? 'checking' : 'unpaid');
    const [orderId, setOrderId] = useState(params.get('order') || '');
    const [message, setMessage] = useState(params.get('error') || '');
    const [retrying, setRetrying] = useState(false);

    const check = useCallback(async () => {
        if (!reference) return;
        setState('checking');
        try {
            const result = await verifyPayment(reference);
            setOrderId(result.orderId);
            setState(result.paymentStatus === 'paid' ? 'paid' : 'unpaid');
            if (result.paymentStatus !== 'paid') setMessage('The payment was not completed.');
        } catch (err) {
            setState('error');
            setMessage(toErrorMessage(err, "We couldn't confirm your payment yet."));
        }
    }, [reference]);

    useEffect(() => {
        check();
    }, [check]);

    const retry = async () => {
        if (!orderId) return;
        setRetrying(true);
        try {
            const { authorizationUrl } = await initializePayment(orderId);
            window.location.href = authorizationUrl;
        } catch (err) {
            setRetrying(false);
            setMessage(toErrorMessage(err, "Couldn't start the payment."));
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-poppins">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                    {state === 'checking' && (
                        <>
                            <Loader2 className="w-10 h-10 text-[#C62222] animate-spin mx-auto mb-4" />
                            <h1 className="text-xl font-bold text-[#222222]">Confirming your payment…</h1>
                        </>
                    )}

                    {state === 'paid' && (
                        <>
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#222222] mb-2">Payment received!</h1>
                            <p className="text-[#667085] mb-2">Your order has been sent to the store.</p>
                            {orderId && (
                                <p className="text-sm text-gray-500 mb-6">
                                    Order ID: <span className="font-mono font-bold">{orderId.slice(-8).toUpperCase()}</span>
                                </p>
                            )}
                            <button onClick={() => navigate('/user-profile')} className="w-full py-3 bg-[#C62222] text-white font-semibold rounded-lg hover:bg-[#A01B1B]">
                                View my orders
                            </button>
                        </>
                    )}

                    {(state === 'unpaid' || state === 'error') && (
                        <>
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-10 h-10 text-[#C62222]" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#222222] mb-2">
                                {state === 'error' ? 'Still checking' : 'Payment not completed'}
                            </h1>
                            <p className="text-[#667085] mb-6">
                                {message || 'Your order is saved but not paid yet. The store will not start it until it is paid.'}
                            </p>
                            <div className="space-y-3">
                                {state === 'error' && reference && (
                                    <button onClick={check} className="w-full py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200">
                                        Check again
                                    </button>
                                )}
                                {orderId && (
                                    <button
                                        onClick={retry}
                                        disabled={retrying}
                                        className="w-full py-3 bg-[#C62222] text-white font-semibold rounded-lg hover:bg-[#A01B1B] disabled:opacity-60"
                                    >
                                        {retrying ? 'Opening payment…' : 'Try paying again'}
                                    </button>
                                )}
                                <button onClick={() => navigate('/explore')} className="w-full py-3 text-sm text-gray-500 hover:text-gray-800">
                                    Back to Explore
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PaymentCallback;

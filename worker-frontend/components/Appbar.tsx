"use client";
import {
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/utils';

export const Appbar = () => {
    const { publicKey , signMessage} = useWallet();
    const [balance, setBalance] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function signAndSend() {
        if (!publicKey) {
            return;
        }
        const message = new TextEncoder().encode("Sign into mechanical turks as a worker");
        const signature = await signMessage?.(message);
        console.log(signature)
        console.log(publicKey)
        const response = await axios.post(`${BACKEND_URL}/v1/worker/signin`, {
            signature,
            publicKey: publicKey?.toString()
        });

        setBalance(response.data.amount)

        localStorage.setItem("token", response.data.token);
    }

    useEffect(() => {
        signAndSend()
    }, [publicKey]);

    if (!mounted) {
        return <div className="flex justify-between border-b pb-2 pt-2">
            <div className="text-2xl pl-4 flex justify-center pt-2">
                Labelchain
            </div>
            <div className="text-xl pr-4 flex" >
                {/* Skeleton or empty space to avoid layout shift */}
            </div>
        </div>
    }

    return (
        <div className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center h-full px-4">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    LabelChain Worker
                </div>
                <div className="flex items-center gap-4">
                    {publicKey && (
                        <button 
                            onClick={async () => {
                                try {
                                    await axios.post(`${BACKEND_URL}/v1/worker/payout`, {}, {
                                        headers: { "Authorization": localStorage.getItem("token") }
                                    });
                                    const balanceRes = await axios.get(`${BACKEND_URL}/v1/worker/balance`, {
                                        headers: { "Authorization": localStorage.getItem("token") }
                                    });
                                    setBalance(balanceRes.data.pendingAmount / 1000000); 
                                } catch (e) {
                                    console.error("Payout failed", e);
                                }
                            }} 
                            className="text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-medium rounded-xl text-sm px-5 py-2.5 shadow-md shadow-blue-100 transition-all hover:-translate-y-0.5"
                        >
                            Pay me out ({balance} SOL)
                        </button>
                    )}
                    {mounted && (publicKey ? <WalletDisconnectButton /> : <WalletMultiButton />)}
                </div>
            </div>
        </div>
    );
}
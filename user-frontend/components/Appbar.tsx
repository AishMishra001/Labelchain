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
    const { publicKey, signMessage } = useWallet();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function signAndSend() {
        if (!publicKey) {
            return;
        }
        try {
            const message = new TextEncoder().encode("Sign into mechanical turks");
            const signature = await signMessage?.(message);
            console.log("Signature obtained:", signature);
            console.log("Public key:", publicKey.toString());
            
            const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
                signature,
                publicKey: publicKey?.toString()
            });
            console.log("Signin response:", response.data);
            localStorage.setItem("token", response.data.token);
        } catch (e) {
            console.error("Signin failed:", e);
        }
    }

    useEffect(() => {
        signAndSend()
    }, [publicKey]);

    return <div className="fixed top-0 w-full z-50">
        <div className="bg-amber-50 text-amber-800 text-xs py-2 px-4 text-center border-b border-amber-100 font-semibold">
            ⚠️ Please switch your wallet to <span className="underline underline-offset-2 decoration-amber-300">Solana Devnet</span>. You must have balance &gt; 0.1 SOL to create tasks.
        </div>
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    LabelChain
                </div>
                <div className="flex items-center gap-4">
                    {mounted && (publicKey ? <WalletDisconnectButton /> : <WalletMultiButton />)}
                </div>
            </div>
        </div>
    </div>
}
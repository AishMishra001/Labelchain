"use client";
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export const Upload = () => {
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [txSignature, setTxSignature] = useState("");
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const router = useRouter();

    async function onSubmit() {
        try {
            const response = await axios.post(`${BACKEND_URL}/v1/user/task`, {
                options: images.map(image => ({
                    imageUrl: image,
                })),
                title,
                signature: txSignature
            }, {
                headers: {
                    "Authorization": localStorage.getItem("token")
                }
            })

            router.push(`/task/${response.data.id}`)
        } catch (error) {
            console.error("Submit failed:", error);
            if (axios.isAxiosError(error) && error.response) {
                alert("Submit failed: " + JSON.stringify(error.response.data));
            } else {
                alert("Submit failed: " + (error as Error).message);
            }
        }
    }

    async function makePayment() {
        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey!,
                    toPubkey: new PublicKey("2KeovpYvrgpziaDsq8nbNMP4mc48VNBVXb5arbqrg9Cq"),
                    lamports: 100000000,
                })
            );

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext();

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey!;

            const signature = await sendTransaction(transaction, connection, { skipPreflight: true });

            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
            setTxSignature(signature);
        } catch (error) {
            console.error("Payment failed:", error);
            alert("Transaction failed: " + (error as Error).message + "\n\nPlease check console for details.");
        }
    }

    return (
        <div className="flex justify-center pb-20">
            <div className="max-w-2xl w-full px-4">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-8 sm:p-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">Create a new task</h2>
                    
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Task Title
                            </label>
                            <input 
                                onChange={(e) => setTitle(e.target.value)} 
                                type="text" 
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 shadow-sm transition-all" 
                                placeholder="What is your task about?" 
                                required 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-4">
                                Add Image Options
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {images.map((image, idx) => (
                                    <div key={idx} className="relative group rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all">
                                        <UploadImage image={image} onImageAdded={(imageUrl) => {
                                            setImages(i => [...i, imageUrl]);
                                        }} />
                                    </div>
                                ))}
                                <div className="flex justify-center items-center rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all min-h-[160px]">
                                    <UploadImage onImageAdded={(imageUrl) => {
                                        setImages(i => [...i, imageUrl]);
                                    }} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={txSignature ? onSubmit : makePayment} 
                                type="button" 
                                className="w-full py-4 px-6 text-white font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
                            >
                                {txSignature ? "Submit Task" : "Pay 0.1 SOL to continue"}
                            </button>
                            {txSignature && (
                                <p className="mt-3 text-center text-sm text-green-600 font-medium">
                                    ✓ Payment confirmed! You can now submit your task.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
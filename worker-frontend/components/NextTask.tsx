"use client"
import { BACKEND_URL, CLOUDFRONT_URL } from "@/utils";
import axios from "axios";
import { useEffect, useState } from "react"

interface Task {
    "id": number,
    "amount": number,
    "title": string,
    "options": {
        id: number;
        image_url: string;
        task_id: number
    }[]
}

// CSR
export const NextTask = () => {
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios.get(`${BACKEND_URL}/v1/worker/nextTask`, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })
            .then(res => {
                setCurrentTask(res.data.task);
                setLoading(false)
            })
            .catch(e => {
                setLoading(false)
                setCurrentTask(null)
            })
    }, [])
    
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Finding next task for you...</p>
            </div>
        );
    }

    if (!currentTask) {
        return (
            <div className="flex justify-center items-center min-h-[60vh] px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tasks available</h3>
                    <p className="text-gray-500">Please check back later. We&apos;re currently looking for more work for you!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-24">
            <div className="mb-12 text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
                    {currentTask.title}
                </h2>
                <div className="flex justify-center items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {currentTask.amount / 1000000} SOL reward
                    </span>
                    {submitting && (
                        <span className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Submitting...
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentTask.options.map(option => (
                    <Option 
                        key={option.id} 
                        imageUrl={option.image_url}
                        onSelect={async () => {
                            if (submitting) return;
                            setSubmitting(true);
                            try {
                                const response = await axios.post(`${BACKEND_URL}/v1/worker/submission`, {
                                    taskId: currentTask.id.toString(),
                                    selection: option.id.toString()
                                }, {
                                    headers: { "Authorization": localStorage.getItem("token") }
                                });
                                setCurrentTask(response.data.nextTask || null);
                            } catch(e) {
                                console.log(e);
                            }
                            setSubmitting(false);
                        }} 
                    />
                ))}
            </div>
        </div>
    );
}

function Option({imageUrl, onSelect}: {
    imageUrl: string;
    onSelect: () => void;
}) {
    let finalImageUrl = imageUrl;
    if (imageUrl.includes("d2szwvl7yo497w.cloudfront.net")) {
        finalImageUrl = imageUrl.replace("d2szwvl7yo497w.cloudfront.net", CLOUDFRONT_URL.replace("https://", ""));
    } else if (!imageUrl.startsWith("http")) {
        finalImageUrl = `${CLOUDFRONT_URL}/${imageUrl}`;
    }

    return (
        <div 
            onClick={onSelect}
            className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 cursor-pointer transform hover:-translate-y-1 active:scale-95"
        >
            <div className="aspect-square w-full overflow-hidden">
                <img 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    src={finalImageUrl} 
                    alt="Task option" 
                />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <span className="text-white font-bold text-lg">Click to select</span>
            </div>
        </div>
    )
}
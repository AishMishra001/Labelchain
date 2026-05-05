"use client"
import { Appbar } from '@/components/Appbar';
import { BACKEND_URL, CLOUDFRONT_URL } from '@/utils';
import axios from 'axios';
import { useEffect, useState } from 'react';

async function getTaskDetails(taskId: string) {
    const response = await axios.get(`${BACKEND_URL}/v1/user/task?taskId=${taskId}`, {
        headers: {
            "Authorization": localStorage.getItem("token")
        }
    })
    return response.data
}

export default function Page({params: { 
    taskId 
}}: {params: { taskId: string }}) {
    const [result, setResult] = useState<Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }>>({});
    const [taskDetails, setTaskDetails] = useState<{
        title?: string
    }>({});

    useEffect(() => {
        getTaskDetails(taskId)
            .then((data) => {
                setResult(data.result)
                setTaskDetails(data.taskDetails)
            })
    }, [taskId]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Appbar />
            <div className="max-w-screen-xl mx-auto px-4 py-32">
                <div className="mb-12">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">
                        {taskDetails.title}
                    </h1>
                    <p className="mt-4 text-center text-gray-600 font-medium">
                        Real-time voting results from decentralized workers
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.keys(result || {}).map(id => (
                        <Task 
                            key={id} 
                            imageUrl={result[id].option.imageUrl} 
                            votes={result[id].count} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function Task({imageUrl, votes}: {
    imageUrl: string;
    votes: number;
}) {
    let finalImageUrl = imageUrl;
    if (imageUrl.includes("d2szwvl7yo497w.cloudfront.net")) {
        finalImageUrl = imageUrl.replace("d2szwvl7yo497w.cloudfront.net", CLOUDFRONT_URL.replace("https://", ""));
    } else if (!imageUrl.startsWith("http")) {
        finalImageUrl = `${CLOUDFRONT_URL}/${imageUrl}`;
    }

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="aspect-square w-full overflow-hidden">
                <img 
                    className="w-full h-full object-cover" 
                    src={finalImageUrl} 
                    alt="Task option" 
                />
            </div>
            <div className="p-6 bg-white">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Votes</span>
                    <span className="text-2xl font-bold text-blue-600">{votes}</span>
                </div>
                <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(votes * 10, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}